<?php

namespace App\Tests\Functional;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class ForgotPasswordTest extends WebTestCase
{
    public function testForgotPasswordMissingEmail(): void
    {
        $client = static::createClient();

        $client->request('POST', '/api/forgot-password', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([]));

        $this->assertResponseStatusCodeSame(400);

        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertStringContainsString('requis', $data['message']);
    }

    public function testForgotPasswordUnknownUserReturnsSameMessage(): void
    {
        $client = static::createClient();

        $client->request('POST', '/api/forgot-password', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => 'nonexistent_' . uniqid() . '@example.com',
        ]));

        // Doit retourner 200 avec un message générique (sécurité : ne pas révéler si le compte existe)
        $this->assertResponseIsSuccessful();

        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertStringContainsString('Si un compte existe', $data['message']);
    }

    public function testForgotPasswordExistingUser(): void
    {
        $client = static::createClient();
        $email = 'forgot_' . uniqid() . '@example.com';

        // Créer un utilisateur
        $client->request('POST', '/api/register', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => $email,
            'username' => 'forgotuser_' . uniqid(),
            'password' => 'OldPassword123!',
        ]));
        $this->assertResponseStatusCodeSame(201);

        // Demander un reset
        $client->request('POST', '/api/forgot-password', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => $email,
        ]));

        $this->assertResponseIsSuccessful();

        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertStringContainsString('Si un compte existe', $data['message']);

        // L'ancien mot de passe ne doit plus fonctionner
        $client->request('POST', '/api/login', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => $email,
            'password' => 'OldPassword123!',
        ]));

        $this->assertResponseStatusCodeSame(401);
    }
}
