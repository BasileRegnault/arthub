<?php

namespace App\Tests\Unit\Entity;

use App\Entity\Artist;
use App\Entity\Artwork;
use App\Entity\User;
use PHPUnit\Framework\TestCase;

class ArtistTest extends TestCase
{
    public function testSettersAndGetters(): void
    {
        $artist = new Artist();

        $artist->setFirstname('Claude');
        $this->assertSame('Claude', $artist->getFirstname());

        $artist->setLastname('Monet');
        $this->assertSame('Monet', $artist->getLastname());

        $artist->setNationality('France');
        $this->assertSame('France', $artist->getNationality());

        $artist->setBiography('Peintre impressionniste');
        $this->assertSame('Peintre impressionniste', $artist->getBiography());
    }

    public function testDatesHandling(): void
    {
        $artist = new Artist();

        $bornAt = new \DateTimeImmutable('1840-11-14');
        $artist->setBornAt($bornAt);
        $this->assertSame($bornAt, $artist->getBornAt());

        $diedAt = new \DateTimeImmutable('1926-12-05');
        $artist->setDiedAt($diedAt);
        $this->assertSame($diedAt, $artist->getDiedAt());
    }

    public function testDiedAtIsNullable(): void
    {
        $artist = new Artist();

        $this->assertNull($artist->getDiedAt());

        $artist->setDiedAt(null);
        $this->assertNull($artist->getDiedAt());
    }

    public function testValidationFlagsDefaults(): void
    {
        $artist = new Artist();

        // Par défaut : isConfirmCreate=true, toBeConfirmed=true
        $this->assertTrue($artist->getIsConfirmCreate());
        $this->assertTrue($artist->getToBeConfirmed());
    }

    public function testValidationFlagsCanBeChanged(): void
    {
        $artist = new Artist();

        $artist->setIsConfirmCreate(false);
        $artist->setToBeConfirmed(false);

        $this->assertFalse($artist->getIsConfirmCreate());
        $this->assertFalse($artist->getToBeConfirmed());
    }

    public function testArtworkCollection(): void
    {
        $artist = new Artist();
        $artwork = new Artwork();

        $this->assertCount(0, $artist->getArtworks());

        $artist->addArtwork($artwork);
        $this->assertCount(1, $artist->getArtworks());
        $this->assertSame($artist, $artwork->getArtist());

        // Pas de doublon
        $artist->addArtwork($artwork);
        $this->assertCount(1, $artist->getArtworks());

        $artist->removeArtwork($artwork);
        $this->assertCount(0, $artist->getArtworks());
    }

    public function testBlameableTrait(): void
    {
        $artist = new Artist();
        $user = new User();
        $user->setEmail('test@example.com');
        $user->setUsername('testuser');
        $user->setPassword('password');

        $artist->setCreatedBy($user);
        $this->assertSame($user, $artist->getCreatedBy());

        $artist->setUpdatedBy($user);
        $this->assertSame($user, $artist->getUpdatedBy());
    }

    public function testOnPrePersistSetsCreatedAt(): void
    {
        $artist = new Artist();

        $artist->onPrePersist();

        $this->assertInstanceOf(\DateTimeImmutable::class, $artist->getCreatedAt());
    }

    public function testOnPreUpdateSetsUpdatedAt(): void
    {
        $artist = new Artist();

        $artist->onPreUpdate();

        $this->assertInstanceOf(\DateTimeImmutable::class, $artist->getUpdatedAt());
    }
}
