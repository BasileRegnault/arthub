<?php

namespace App\Tests\Functional;

use App\Tests\Functional\Trait\JwtTestTrait;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class ArtistEndpointTest extends WebTestCase
{
    use JwtTestTrait;

    public function testListArtistsIsPublic(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/artists', [], [], $this->publicHeaders());
        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('member', $data);
    }

    public function testCreateArtistAsUser(): void
    {
        $client = static::createClient();
        $user = $this->createUser();
        $token = $this->getJwtToken($user);
        $client->request('POST', '/api/artists', [], [], $this->authHeaders($token), json_encode([
            'firstname' => 'Pablo',
            'lastname' => 'Picasso',
            'bornAt' => '1881-10-25',
            'nationality' => 'Espagne',
        ]));
        $this->assertResponseStatusCodeSame(201);
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertSame('Pablo', $data['firstname']);
        $this->assertSame('Picasso', $data['lastname']);
        // Un utilisateur normal : l'artiste doit être en attente de confirmation
        $this->assertFalse($data['isConfirmCreate']);
        $this->assertTrue($data['toBeConfirmed']);
    }

    public function testCreateArtistAsAdmin(): void
    {
        $client = static::createClient();
        $admin = $this->createUser(['ROLE_ADMIN']);
        $token = $this->getJwtToken($admin);
        $client->request('POST', '/api/artists', [], [], $this->authHeaders($token), json_encode([
            'firstname' => 'Claude',
            'lastname' => 'Monet',
            'bornAt' => '1840-11-14',
            'nationality' => 'France',
        ]));
        $this->assertResponseStatusCodeSame(201);
        $data = json_decode($client->getResponse()->getContent(), true);
        // Un admin : l'artiste est automatiquement confirmé
        $this->assertTrue($data['isConfirmCreate']);
        $this->assertFalse($data['toBeConfirmed']);
    }

    public function testCreateArtistUnauthenticated(): void
    {
        $client = static::createClient();
        $client->request('POST', '/api/artists', [], [], [
            'CONTENT_TYPE' => 'application/ld+json',
            'HTTP_ACCEPT' => 'application/ld+json',
        ], json_encode([
            'firstname' => 'Test',
            'lastname' => 'Artist',
            'bornAt' => '1900-01-01',
        ]));
        $this->assertResponseStatusCodeSame(401);
    }

    public function testCreateArtistValidationErrors(): void
    {
        $client = static::createClient();
        $user = $this->createUser();
        $token = $this->getJwtToken($user);
        $client->request('POST', '/api/artists', [], [], $this->authHeaders($token), json_encode([
            'lastname' => 'Monet',
            'bornAt' => '1840-11-14',
        ]));
        $this->assertResponseStatusCodeSame(422);
    }

    public function testDeleteArtistAsNonAdmin(): void
    {
        $client = static::createClient();
        $user = $this->createUser();
        $token = $this->getJwtToken($user);
        $client->request('POST', '/api/artists', [], [], $this->authHeaders($token), json_encode([
            'firstname' => 'ToDelete',
            'lastname' => 'Artist',
            'bornAt' => '1900-01-01',
        ]));
        $this->assertResponseStatusCodeSame(201);
        $data = json_decode($client->getResponse()->getContent(), true);
        $artistIri = $data['@id'];
        $client->request('DELETE', $artistIri, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $token,
        ]);
        $this->assertResponseStatusCodeSame(403);
    }

    public function testGetSingleArtistIsPublic(): void
    {
        $client = static::createClient();
        $user = $this->createUser();
        $token = $this->getJwtToken($user);
        $client->request('POST', '/api/artists', [], [], $this->authHeaders($token), json_encode([
            'firstname' => 'Vincent',
            'lastname' => 'Van Gogh',
            'bornAt' => '1853-03-30',
            'nationality' => 'Pays-Bas',
        ]));
        $this->assertResponseStatusCodeSame(201);
        $data = json_decode($client->getResponse()->getContent(), true);
        $artistIri = $data['@id'];
        $client->request('GET', $artistIri, [], [], $this->publicHeaders());
        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertSame('Vincent', $data['firstname']);
    }
}
