<?php

namespace App\Tests\Functional\Trait;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Trait partagé pour les tests fonctionnels nécessitant une authentification JWT.
 */
trait JwtTestTrait
{
    private function createUser(array $roles = ['ROLE_USER']): User
    {
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $hasher = static::getContainer()->get('security.user_password_hasher');

        $user = new User();
        $user->setEmail('test_' . uniqid() . '@example.com');
        $user->setUsername('testuser_' . uniqid());
        $user->setPassword($hasher->hashPassword($user, 'TestPass123!'));
        $user->setRoles($roles);
        $em->persist($user);
        $em->flush();

        return $user;
    }

    /**
     * Génère un token JWT valide pour un utilisateur.
     */
    private function getJwtToken(User $user): string
    {
        $jwtManager = static::getContainer()->get('lexik_jwt_authentication.jwt_manager');

        return $jwtManager->create($user);
    }

    /**
     * Retourne les headers HTTP avec authentification JWT.
     */
    private function authHeaders(string $token, string $contentType = 'application/ld+json'): array
    {
        return [
            'CONTENT_TYPE' => $contentType,
            'HTTP_ACCEPT' => 'application/ld+json',
            'HTTP_AUTHORIZATION' => 'Bearer ' . $token,
        ];
    }

    /**
     * Retourne les headers HTTP sans authentification.
     */
    private function publicHeaders(): array
    {
        return [
            'HTTP_ACCEPT' => 'application/ld+json',
        ];
    }
}
