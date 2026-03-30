<?php

namespace App\Tests\Unit\Entity;

use App\Entity\User;
use PHPUnit\Framework\TestCase;

class UserTest extends TestCase
{
    public function testDefaultRolesContainsRoleUser(): void
    {
        $user = new User();

        $this->assertContains('ROLE_USER', $user->getRoles());
    }

    public function testSetRolesAlwaysIncludesRoleUser(): void
    {
        $user = new User();
        $user->setRoles(['ROLE_ADMIN']);

        $roles = $user->getRoles();
        $this->assertContains('ROLE_USER', $roles);
        $this->assertContains('ROLE_ADMIN', $roles);
    }

    public function testRolesAreUnique(): void
    {
        $user = new User();
        $user->setRoles(['ROLE_USER', 'ROLE_USER', 'ROLE_ADMIN']);

        $roles = $user->getRoles();
        $this->assertCount(2, $roles);
    }

    public function testSettersAndGetters(): void
    {
        $user = new User();

        $user->setEmail('test@example.com');
        $this->assertSame('test@example.com', $user->getEmail());

        $user->setUsername('testuser');
        $this->assertSame('testuser', $user->getUsername());

        $user->setPassword('hashed_password');
        $this->assertSame('hashed_password', $user->getPassword());
    }

    public function testUserIdentifierReturnsEmail(): void
    {
        $user = new User();
        $user->setEmail('test@example.com');

        $this->assertSame('test@example.com', $user->getUserIdentifier());
    }

    public function testIsSuspendedDefaultFalse(): void
    {
        $user = new User();

        $this->assertFalse($user->getIsSuspended());
    }

    public function testOnPrePersistSetsCreatedAt(): void
    {
        $user = new User();
        $this->assertNull($user->getCreatedAt());

        $user->onPrePersist();

        $this->assertInstanceOf(\DateTimeImmutable::class, $user->getCreatedAt());
    }

    public function testOnPrePersistDoesNotOverwriteCreatedAt(): void
    {
        $user = new User();
        $original = new \DateTimeImmutable('2020-01-01');
        $user->setCreatedAt($original);

        $user->onPrePersist();

        $this->assertSame($original, $user->getCreatedAt());
    }

    public function testOnPreUpdateSetsUpdatedAt(): void
    {
        $user = new User();
        $this->assertNull($user->getUpdatedAt());

        $user->onPreUpdate();

        $this->assertInstanceOf(\DateTimeImmutable::class, $user->getUpdatedAt());
    }

    public function testNewUserHasEmptyCollections(): void
    {
        $user = new User();

        $this->assertCount(0, $user->getGalleries());
        $this->assertCount(0, $user->getRatings());
        $this->assertCount(0, $user->getArtworks());
        $this->assertCount(0, $user->getArtists());
        $this->assertCount(0, $user->getUserLoginLogs());
        $this->assertCount(0, $user->getActivityLogs());
    }

    public function testIdIsNullByDefault(): void
    {
        $user = new User();

        $this->assertNull($user->getId());
    }
}
