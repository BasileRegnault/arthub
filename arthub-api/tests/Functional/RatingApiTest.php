<?php

namespace App\Tests\Functional;

use App\Entity\Artist;
use App\Entity\Artwork;
use App\Enum\ArtworkType;
use App\Enum\ArtworkStyle;
use App\Tests\Functional\Trait\JwtTestTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class RatingApiTest extends WebTestCase
{
    use JwtTestTrait;

    private function createTestArtwork($user): Artwork
    {
        $em = static::getContainer()->get(EntityManagerInterface::class);

        $artist = new Artist();
        $artist->setFirstname('Test');
        $artist->setLastname('Artist_' . uniqid());
        $artist->setBornAt(new \DateTimeImmutable('1900-01-01'));
        $artist->setIsConfirmCreate(true);
        $artist->setToBeConfirmed(false);
        $artist->setCreatedBy($user);
        $em->persist($artist);

        $artwork = new Artwork();
        $artwork->setTitle('Test Artwork ' . uniqid());
        $artwork->setArtist($artist);
        $artwork->setType(ArtworkType::PAINTING);
        $artwork->setStyle(ArtworkStyle::IMPRESSIONISM);
        $artwork->setDescription('Description de test pour une œuvre artistique de qualité.');
        $artwork->setCreationDate(new \DateTimeImmutable('1900-01-01'));
        $artwork->setIsDisplay(true);
        $artwork->setIsConfirmCreate(true);
        $artwork->setToBeConfirmed(false);
        $artwork->setCreatedBy($user);
        $em->persist($artwork);
        $em->flush();

        return $artwork;
    }

    public function testCreateRatingAsUser(): void
    {
        $client = static::createClient();
        $user = $this->createUser();
        $token = $this->getJwtToken($user);

        $artwork = $this->createTestArtwork($user);

        $client->request('POST', '/api/ratings', [], [], $this->authHeaders($token), json_encode([
            'score' => 4.5,
            'comment' => 'Magnifique œuvre !',
            'artwork' => '/api/artworks/' . $artwork->getId(),
        ]));

        $this->assertResponseStatusCodeSame(201);

        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertSame(4.5, $data['score']);
        $this->assertSame('Magnifique œuvre !', $data['comment']);
    }

    public function testCreateRatingUnauthenticated(): void
    {
        $client = static::createClient();

        $client->request('POST', '/api/ratings', [], [], [
            'CONTENT_TYPE' => 'application/ld+json',
            'HTTP_ACCEPT' => 'application/ld+json',
        ], json_encode([
            'score' => 3,
            'artwork' => '/api/artworks/1',
        ]));

        $this->assertResponseStatusCodeSame(401);
    }

    public function testCreateRatingInvalidScore(): void
    {
        $client = static::createClient();
        $user = $this->createUser();
        $token = $this->getJwtToken($user);

        $artwork = $this->createTestArtwork($user);

        // Score trop élevé (> 5)
        $client->request('POST', '/api/ratings', [], [], $this->authHeaders($token), json_encode([
            'score' => 10,
            'artwork' => '/api/artworks/' . $artwork->getId(),
        ]));

        $this->assertResponseStatusCodeSame(422);

        // Score négatif
        $client->request('POST', '/api/ratings', [], [], $this->authHeaders($token), json_encode([
            'score' => -1,
            'artwork' => '/api/artworks/' . $artwork->getId(),
        ]));

        $this->assertResponseStatusCodeSame(422);
    }

    public function testListRatingsIsPublic(): void
    {
        $client = static::createClient();

        $client->request('GET', '/api/ratings', [], [], $this->publicHeaders());

        $this->assertResponseIsSuccessful();

        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('member', $data);
    }

    public function testDeleteOwnRating(): void
    {
        $client = static::createClient();
        $user = $this->createUser();
        $token = $this->getJwtToken($user);

        $artwork = $this->createTestArtwork($user);

        // Créer un rating
        $client->request('POST', '/api/ratings', [], [], $this->authHeaders($token), json_encode([
            'score' => 3,
            'artwork' => '/api/artworks/' . $artwork->getId(),
        ]));
        $this->assertResponseStatusCodeSame(201);

        $data = json_decode($client->getResponse()->getContent(), true);
        $ratingIri = $data['@id'];

        // Supprimer son propre rating
        $client->request('DELETE', $ratingIri, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $token,
        ]);

        $this->assertResponseStatusCodeSame(204);
    }

    public function testDeleteOtherUserRating(): void
    {
        $client = static::createClient();

        // Utilisateur 1 crée un rating
        $user1 = $this->createUser();
        $token1 = $this->getJwtToken($user1);
        $artwork = $this->createTestArtwork($user1);

        $client->request('POST', '/api/ratings', [], [], $this->authHeaders($token1), json_encode([
            'score' => 5,
            'artwork' => '/api/artworks/' . $artwork->getId(),
        ]));
        $this->assertResponseStatusCodeSame(201);

        $data = json_decode($client->getResponse()->getContent(), true);
        $ratingIri = $data['@id'];

        // Utilisateur 2 tente de supprimer le rating de l'utilisateur 1 → 403
        $user2 = $this->createUser();
        $token2 = $this->getJwtToken($user2);

        $client->request('DELETE', $ratingIri, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $token2,
        ]);

        $this->assertResponseStatusCodeSame(403);
    }
}
