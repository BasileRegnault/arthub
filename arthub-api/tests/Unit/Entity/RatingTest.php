<?php

namespace App\Tests\Unit\Entity;

use App\Entity\Artwork;
use App\Entity\Rating;
use PHPUnit\Framework\TestCase;

class RatingTest extends TestCase
{
    public function testSettersAndGetters(): void
    {
        $rating = new Rating();

        $rating->setScore(4.5);
        $this->assertSame(4.5, $rating->getScore());

        $rating->setComment('Superbe œuvre');
        $this->assertSame('Superbe œuvre', $rating->getComment());
    }

    public function testArtworkRelation(): void
    {
        $rating = new Rating();
        $artwork = new Artwork();

        $rating->setArtwork($artwork);

        $this->assertSame($artwork, $rating->getArtwork());
    }

    public function testNullableComment(): void
    {
        $rating = new Rating();

        $rating->setComment(null);
        $this->assertNull($rating->getComment());
    }

    public function testOnPrePersistSetsCreatedAt(): void
    {
        $rating = new Rating();
        $this->assertNull($rating->getCreatedAt());

        $rating->onPrePersist();

        $this->assertInstanceOf(\DateTimeImmutable::class, $rating->getCreatedAt());
    }

    public function testOnPreUpdateSetsUpdatedAt(): void
    {
        $rating = new Rating();
        $this->assertNull($rating->getUpdatedAt());

        $rating->onPreUpdate();

        $this->assertInstanceOf(\DateTimeImmutable::class, $rating->getUpdatedAt());
    }

    public function testDefaultValues(): void
    {
        $rating = new Rating();

        $this->assertNull($rating->getId());
        $this->assertNull($rating->getScore());
        $this->assertNull($rating->getComment());
        $this->assertNull($rating->getArtwork());
    }
}
