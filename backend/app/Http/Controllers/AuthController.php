<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\Plan;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class AuthController extends Controller
{
    use ApiResponse;

    /**
     * Register a new user and assign the default Free plan subscription.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $email = strtolower(trim($validated['email']));

        $user = DB::transaction(function () use ($validated, $email) {
            $user = User::create([
                'name' => trim($validated['name']),
                'email' => $email,
                'password' => Hash::make($validated['password']),
            ]);

            $freePlan = Plan::where('name', 'free')->first();
            if ($freePlan) {
                $user->subscriptions()->create([
                    'plan_id' => $freePlan->id,
                    'status' => 'active',
                    'starts_at' => now(),
                ]);
            }

            return $user;
        });

        try {
            $user->sendEmailVerificationNotification();
        } catch (Throwable $e) {
            Log::warning('Verification email dispatch failed during registration', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return $this->successResponse([
            'user' => $user->load('subscription.plan'),
            'token' => $token,
            'access_token' => $token,
        ], 'Registration successful', Response::HTTP_CREATED);
    }

    /**
     * Authenticate user and issue Sanctum token.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $email = strtolower(trim($validated['email']));

        $user = User::where('email', $email)->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            return $this->errorResponse('Invalid credentials', Response::HTTP_UNAUTHORIZED);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return $this->successResponse([
            'user' => $user->load('subscription.plan'),
            'token' => $token,
            'access_token' => $token,
        ], 'Login successful');
    }

    /**
     * Send password reset link without disclosing whether the email exists.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
        ]);

        try {
            Password::sendResetLink([
                'email' => strtolower(trim($validated['email'])),
            ]);
        } catch (Throwable $e) {
            Log::warning('Password reset link dispatch failed', ['error' => $e->getMessage()]);
        }

        return $this->successResponse(
            [],
            'If an account exists for that email address, password reset instructions have been sent.'
        );
    }

    /**
     * Reset user password with a valid token and revoke existing API tokens.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string', 'confirmed', PasswordRule::min(8)->max(128)],
        ]);

        $status = Password::reset(
            [
                'email' => strtolower(trim($validated['email'])),
                'password' => $validated['password'],
                'password_confirmation' => $request->input('password_confirmation'),
                'token' => $validated['token'],
            ],
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => Hash::make($password),
                ])->save();

                $user->tokens()->delete();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return $this->successResponse([], 'Your password has been reset. Please sign in with your new password.');
        }

        return $this->errorResponse(__($status), Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    /**
     * Verify user email using signed URL without requiring active cookie session.
     */
    public function verifyEmail(Request $request, int $id, string $hash): JsonResponse|RedirectResponse
    {
        $frontendBase = rtrim((string) config('app.frontend_url', 'http://localhost:5173'), '/');
        $user = User::find($id);

        if (! $request->hasValidSignature() || ! $user || ! hash_equals(sha1($user->getEmailForVerification()), $hash)) {
            if ($request->expectsJson()) {
                return $this->errorResponse('Invalid or expired verification link.', Response::HTTP_FORBIDDEN);
            }

            return redirect()->away("{$frontendBase}/verify-email?status=invalid");
        }

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }

        if ($request->expectsJson()) {
            return $this->successResponse([], 'Email verified successfully.');
        }

        return redirect()->away("{$frontendBase}/verify-email?status=verified");
    }

    /**
     * Re-send verification email to authenticated user.
     */
    public function resendVerification(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return $this->successResponse(['verified' => true], 'Email is already verified.');
        }

        try {
            $user->sendEmailVerificationNotification();
        } catch (Throwable $e) {
            Log::warning('Verification email resend failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return $this->errorResponse(
                'Unable to send verification email right now. Check mail server configuration.',
                Response::HTTP_SERVICE_UNAVAILABLE
            );
        }

        return $this->successResponse(['verified' => false], 'Verification email sent.');
    }

    /**
     * Update authenticated user's password and revoke other active tokens.
     */
    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'confirmed', PasswordRule::min(8)->max(128)],
        ]);

        $user = $request->user();
        if (! Hash::check($validated['current_password'], $user->password)) {
            return $this->errorResponse('Current password is incorrect.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $user->forceFill([
            'password' => Hash::make($validated['password']),
        ])->save();

        $currentTokenId = $user->currentAccessToken()?->id;
        $user->tokens()
            ->when($currentTokenId, fn ($q) => $q->where('id', '!=', $currentTokenId))
            ->delete();

        return $this->successResponse([], 'Password updated successfully.');
    }

    /**
     * Permanently delete the authenticated user's account and all owned data.
     */
    public function deleteAccount(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
        ]);

        $user = $request->user();
        if (! Hash::check($validated['current_password'], $user->password)) {
            return $this->errorResponse('Password confirmation failed.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        DB::transaction(function () use ($user): void {
            $user->tokens()->delete();
            DB::table('sessions')->where('user_id', $user->id)->delete();
            $user->delete();
        });

        return $this->successResponse([], 'Account deleted permanently.');
    }

    /**
     * Revoke the current access token.
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user && $user->currentAccessToken()) {
            $user->currentAccessToken()->delete();
        }

        return $this->successResponse([], 'Logged out successfully');
    }

    /**
     * Get the authenticated user with subscription and plan.
     */
    public function user(Request $request): JsonResponse
    {
        $user = $request->user()->load(['subscription.plan']);

        return $this->successResponse([
            'user' => $user,
        ], 'User retrieved successfully');
    }
}
