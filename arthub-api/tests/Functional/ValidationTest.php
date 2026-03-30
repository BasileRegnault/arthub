<?php

namespace App\Tests\Functional;

use App\Entity\Artist;
use App\Tests\Functional\Trait\JwtTestTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class ValidationTest extends WebTestCase
{
    use JwtTestTrait;

    private function createTestArtist($createdBy): Artist
    {
        $em = static::getContainer()->get(EntityManagerInterface::class);

        $artist = new Artist();
        $artist->setFirstname('Test');
        $artist->setLastname('Artist_' . uniqid());
        $artist->setBornAt(new \DateTimeImmutable('1900-01-01'));
        $artist->setIsConfirmCreate(false);
        $artist->setToBeConfirmed(false);
        $artist->setCreatedBy($createdBy);
        $em->persist($artist);
        $em->flush();

        return $artist;
    }

    public function testApproveArtist(): void
    {
        $client = static::createClient();
        $admin = $this->createUser(['ROLE_ADMIN']);
        $token = $this->getJwtToken($admin);

        $artist = $this->createTestArtist($admin);

        $client->request('POST', '/api/admin/validate/artist/' . $artist->getId(), [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_AUTHORIZATION' => 'Bearer ' . $token,
        ], json_encode([
            'status' => 'approved',
            'reason' => 'Artiste vérifié',
        ]));

        $this->assertResponseIsSuccessful();

        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertSame('approved', $data['status']);
        $this->assertSame($artist->getId(), $data['subjectId']);
    }

    public function testRejectArtist(): void
    {
        $client = static::createClient();
        $admin = $this->createUser(['ROLE_ADMIN']);
        $token = $this->getJwtToken($admin);

        $artist = $this->createTestArtist($admin);

        $client->request('POST', '/api/admin/validate/artist/' . $artist->getId(), [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_AUTHORIZATION' => 'Bearer ' . $token,
        ], json_encode([
            'status' => 'rejected',
            'reason' => 'Informations insuffisantes',
        ]));

        $this->assertResponseIsSuccessful();

        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertSame('rejected', $data['status']);
    }

    public function testInvalidType(): void
    {
        $client = static::createClient();
        $admin = $this->createUser(['ROLE_ADMIN']);
        $token = $this->getJwtToken($admin);

        $client->request('POST', '/api/admin/validate/invalidtype/1', [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_AUTHORIZATION' => 'Bearer ' . $token,
        ], json_encode([
            'status' => 'approved',
        ]));

        $this->assertResponseStatusCodeSame(400);
    }

    public function testInvalidStatus(): void
    {
        $client = static::createClient();
        $admin = $this->createUser(['ROLE_ADMIN']);
        $token = $this->getJwtToken($admin);

        $artist = $this->createTestArtist($admin);

        $client->request('POST', '/api/admin/validate/artist/' . $artist->getId(), [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_AUTHORIZATION' => 'Bearer ' . $token,
        ], json_encode([
            'status' => 'invalid_status',
        ]));

        $this->assertResponseStatusCodeSame(400);
    }

    public function testSubjectNotFound(): void
    {
        $client = static::createClient();
        $admin = $this->createUser(['ROLE_ADMIN']);
        $token = $this->getJwtToken($admin);

        $client->request('POST', '/api/admin/validate/artist/999999', [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_AUTHORIZATION' => 'Bearer ' . $token,
        ], json_encode([
            'status' => 'approved',
        ]));

        $this->assertResponseStatusCodeSame(404);
    }
}
