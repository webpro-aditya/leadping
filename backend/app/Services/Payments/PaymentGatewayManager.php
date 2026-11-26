<?php

namespace App\Services\Payments;

use Closure;
use InvalidArgumentException;

class PaymentGatewayManager
{
    /**
     * Resolved gateway instances.
     *
     * @var array<string, PaymentGatewayInterface>
     */
    protected array $drivers = [];

    /**
     * Custom gateway driver factories registered at runtime.
     *
     * @var array<string, Closure>
     */
    protected array $customCreators = [];

    public function getDefaultDriver(): string
    {
        return strtolower((string) config('payments.default', 'razorpay'));
    }

    public function driver(?string $name = null): PaymentGatewayInterface
    {
        $name = strtolower(trim($name ?: $this->getDefaultDriver()));

        if (! isset($this->drivers[$name])) {
            $this->drivers[$name] = $this->resolve($name);
        }

        return $this->drivers[$name];
    }

    /**
     * Register a custom gateway factory so additional gateways can be plugged in dynamically.
     */
    public function extend(string $name, Closure $creator): self
    {
        $key = strtolower(trim($name));
        $this->customCreators[$key] = $creator;
        unset($this->drivers[$key]);

        return $this;
    }

    /**
     * List configured gateways and whether credentials are set.
     *
     * @return array<int, array<string, mixed>>
     */
    public function availableGateways(): array
    {
        $gateways = config('payments.gateways', []);
        $default = $this->getDefaultDriver();
        $list = [];

        foreach ($gateways as $key => $cfg) {
            $list[] = [
                'id' => $key,
                'label' => $cfg['label'] ?? ucfirst($key),
                'currency' => $cfg['currency'] ?? 'INR',
                'is_default' => $key === $default,
                'configured' => ! empty($cfg['key_id']) && ! empty($cfg['key_secret']),
            ];
        }

        return $list;
    }

    protected function resolve(string $name): PaymentGatewayInterface
    {
        if (isset($this->customCreators[$name])) {
            $driver = ($this->customCreators[$name])();
            if (! $driver instanceof PaymentGatewayInterface) {
                throw new InvalidArgumentException("Custom gateway [{$name}] must implement PaymentGatewayInterface.");
            }

            return $driver;
        }

        return match ($name) {
            'razorpay' => new RazorpayGateway(config('payments.gateways.razorpay')),
            default => throw new InvalidArgumentException("Unsupported payment gateway: [{$name}]"),
        };
    }
}
