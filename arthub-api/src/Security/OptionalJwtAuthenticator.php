<?php

namespace App\Security;

use Lexik\Bundle\JWTAuthenticationBundle\Security\Authenticator\JWTAuthenticator;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Http\Authenticator\Passport\Passport;

/**
 * Authenticator JWT optionnel - permet l'accès anonyme si pas de token
 */
class OptionalJwtAuthenticator extends JWTAuthenticator
{
    public function supports(Request $request): ?bool
    {
        // Ne supporte la requête que s'il y a un header Authorization avec Bearer
        $authHeader = $request->headers->get('Authorization', '');

        if (!str_starts_with($authHeader, 'Bearer ')) {
            return false; // Pas de token = accès anonyme, on ne gère pas cette requête
        }

        return parent::supports($request);
    }
}
