<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\Metadata\Post;
use ApiPlatform\State\ProcessorInterface;
use ApiPlatform\Doctrine\Orm\State\PersistProcessor;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Bundle\SecurityBundle\Security;
use App\Entity\Artwork;

class ArtworkProcessor implements ProcessorInterface
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
        if ($data instanceof Artwork && $operation instanceof Post) {
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