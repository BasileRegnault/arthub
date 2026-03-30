<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\Metadata\Post;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Artist;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Bundle\SecurityBundle\Security;

class ArtistProcessor implements ProcessorInterface
{
    public function __construct(
        private Security $security,
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private ProcessorInterface $persistProcessor,
    ) {}

    public function process(
        mixed $data,
        Operation $operation,
        array $uriVariables = [],
        array $context = []
    ): mixed {
        if ($data instanceof Artist && $operation instanceof Post) {
            $data->setIsConfirmCreate(
                $this->security->isGranted('ROLE_ADMIN')
            );

            $data->setToBeConfirmed(
                !$this->security->isGranted('ROLE_ADMIN')
            );
        }

        return $this->persistProcessor->process(
            $data,
            $operation,
            $uriVariables,
            $context
        );
    }
}