<?php

namespace App\Services\AI;

use InvalidArgumentException;

class AIManager
{
    /**
     * Cache of resolved providers.
     *
     * @var array<string, AIProviderInterface>
     */
    protected array $providers = [];

    /**
     * Get an AI provider instance.
     */
    public function provider(?string $name = null): AIProviderInterface
    {
        $name = $name ?: config('ai.default', 'openai');

        if (!isset($this->providers[$name])) {
            $this->providers[$name] = $this->resolve($name);
        }

        return $this->providers[$name];
    }

    /**
     * Resolve the requested provider.
     */
    protected function resolve(string $name): AIProviderInterface
    {
        return match ($name) {
            'openai' => new OpenAIProvider(),
            default => throw new InvalidArgumentException("Unsupported AI provider: [{$name}]"),
        };
    }

    /**
     * Forward calls dynamically to default provider.
     */
    public function __call(string $method, array $parameters): mixed
    {
        return $this->provider()->$method(...$parameters);
    }
}
