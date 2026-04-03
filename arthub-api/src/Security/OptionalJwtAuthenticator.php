<?php

namespace App\Security;

use Lexik\Bundle\JWTAuthenticationBundle\Security\Authenticator\JWTAuthenticator;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Http\Authenticator\Passport\Passport;

/**
 * Authentificateur JWT optionnel.
 * Si aucun token n'est présent dans la requête, l'accès anonyme est accordé
 * sans déclencher d'erreur d'authentification.
 */
class OptionalJwtAuthenticator extends JWTAuthenticator
{
    public function supports(Request $request): ?bool
    {
        // On n'intercepte la requête que si elle contient un header Authorization de type Bearer
        $authHeader = $request->headers->get('Authorization', '');

        if (!str_starts_with($authHeader, 'Bearer ')) {
            return false; // Pas de token → on laisse passer en anonyme
        }

        return parent::supports($request);
    }
}
