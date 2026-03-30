<?php

namespace App\Security;

class IpHasher
{
    public function __construct(
        private string $appSecret
    ) {}

    public function hash(?string $ip): string
    {
        if (!$ip || $ip === 'unknown') {
            return 'unknown';
        }

        return hash('sha256', $ip . $this->appSecret);
    }
}