<?php

namespace App\Tests\Unit\Security;

use App\Security\IpHasher;
use PHPUnit\Framework\TestCase;

class IpHasherTest extends TestCase
{
    private IpHasher $hasher;

    protected function setUp(): void
    {
        $this->hasher = new IpHasher('test_secret_key');
    }

    public function testHashReturnsConsistentResult(): void
    {
        $ip = '192.168.1.1';
        $hash1 = $this->hasher->hash($ip);
        $hash2 = $this->hasher->hash($ip);

        $this->assertSame($hash1, $hash2);
    }

    public function testHashReturnsSha256Format(): void
    {
        $hash = $this->hasher->hash('192.168.1.1');

        // SHA-256 produit un hash hexadécimal de 64 caractères
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $hash);
    }

    public function testHashNullReturnsUnknown(): void
    {
        $this->assertSame('unknown', $this->hasher->hash(null));
    }

    public function testHashUnknownStringReturnsUnknown(): void
    {
        $this->assertSame('unknown', $this->hasher->hash('unknown'));
    }

    public function testDifferentIpsProduceDifferentHashes(): void
    {
        $hash1 = $this->hasher->hash('192.168.1.1');
        $hash2 = $this->hasher->hash('10.0.0.1');

        $this->assertNotSame($hash1, $hash2);
    }

    public function testDifferentSecretsProduceDifferentHashes(): void
    {
        $hasher2 = new IpHasher('another_secret');

        $hash1 = $this->hasher->hash('192.168.1.1');
        $hash2 = $hasher2->hash('192.168.1.1');

        $this->assertNotSame($hash1, $hash2);
    }
}
