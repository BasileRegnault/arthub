<?php

namespace App\Tests\Functional;

use App\Tests\Functional\Trait\JwtTestTrait;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class AuthTest extends WebTestCase
{
    use JwtTestTrait;

    // ===================================
    // INSCRIPTION
    // ===================================

    public function testRegisterSuccess(): void
    {
        $client = static::createClient();
        $email = 'test_' . uniqid() . '@example.com';

        $client->request('POST', '/api/register', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => $email,
            'username' => 'user_' . uniqid(),
            'password' => 'SecurePass123!',
        ]));

        $this->assertResponseStatusCodeSame(201);

        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertSame('Utilisateur créé avec succès', $data['message']);
    }

    public function testRegisterMissingFields(): void
    {
        $client = static::createClient();

        // Sans email
        $client->request('POST', '/api/register', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'username' => 'testuser',
            'password' => 'SecurePass123!',
        ]));

        $this->assertResponseStatusCodeSame(400);

        // Sans password
        $client->request('POST', '/api/register', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => 'test_' . uniqid() . '@example.com',
            'username' => 'testuser',
        ]));

        $this->assertResponseStatusCodeSame(400);

        // Sans username
        $client->request('POST', '/api/register', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => 'test_' . uniqid() . '@example.com',
            'password' => 'SecurePass123!',
        ]));

        $this->assertResponseStatusCodeSame(400);
    }

    public function testRegisterDuplicateEmail(): void
    {
        $client = static::createClient();
        $email = 'duplicate_' . uniqid() . '@example.com';

        // Première inscription
        $client->request('POST', '/api/register', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => $email,
            'username' => 'user1_' . uniqid(),
            'password' => 'SecurePass123!',
        ]));
        $this->assertResponseStatusCodeSame(201);

        // Deuxième inscription avec le même email
        $client->request('POST', '/api/register', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => $email,
            'username' => 'user2_' . uniqid(),
            'password' => 'SecurePass123!',
        ]));
        $this->assertResponseStatusCodeSame(400);

        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertStringContainsString('existant', $data['error']);
    }

    public function testRegisterDuplicateUsername(): void
    {
        $client = static::createClient();
        $username = 'uniqueuser_' . uniqid();

        // Première inscription
        $client->request('POST', '/api/register', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => 'first_' . uniqid() . '@example.com',
            'username' => $username,
            'password' => 'SecurePass123!',
        ]));
        $this->assertResponseStatusCodeSame(201);

        // Deuxième inscription avec le même username
        $client->request('POST', '/api/register', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => 'second_' . uniqid() . '@example.com',
            'username' => $username,
            'password' => 'SecurePass123!',
        ]));
        $this->assertResponseStatusCodeSame(400);

        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertStringContainsString('utilisateur', $data['error']);
    }

    // ===================================
    // CONNEXION
    // ===================================

    public function testLoginSuccess(): void
    {
        $client = static::createClient();
        $email = 'login_' . uniqid() . '@example.com';
        $password = 'SecurePass123!';

        // Créer le compte
        $client->request('POST', '/api/register', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => $email,
            'username' => 'loginuser_' . uniqid(),
            'password' => $password,
        ]));
        $this->assertResponseStatusCodeSame(201);

        // Se connecter
        $client->request('POST', '/api/login', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => $email,
            'password' => $password,
        ]));

        $this->assertResponseIsSuccessful();

        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('token', $data);
        $this->assertArrayHasKey('refresh_token', $data);
        $this->assertNotEmpty($data['token']);
    }

    public function testLoginInvalidCredentials(): void
    {
        $client = static::createClient();

        $client->request('POST', '/api/login', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => 'nonexistent@example.com',
            'password' => 'WrongPassword!',
        ]));

        $this->assertResponseStatusCodeSame(401);
    }

    // ===================================
    // /api/me
    // ===================================

    public function testMeUnauthenticated(): void
    {
        $client = static::createClient();

        $client->request('GET', '/api/me');

        $this->assertResponseStatusCodeSame(401);
    }

    public function testMeAuthenticated(): void
    {
        $client = static::createClient();
        $user = $this->createUser();
        $token = $this->getJwtToken($user);

        $client->request('GET', '/api/me', [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $token,
        ]);

        $this->assertResponseIsSuccessful();

        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertSame($user->getEmail(), $data['email']);
        $this->assertSame($user->getUsername(), $data['username']);
    }
}
