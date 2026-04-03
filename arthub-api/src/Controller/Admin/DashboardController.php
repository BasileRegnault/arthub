<?php

namespace App\Controller\Admin;

use App\Service\DashboardService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/admin/dashboard', name: 'admin_dashboard_')]
class DashboardController extends AbstractController
{
    public function __construct(private DashboardService $dashboardService) {}

    #[Route('', name: 'stats', methods: ['GET'])]
    public function stats(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');
        $limits = [
            'connections'   => (int) $request->query->get('limitConnections', 10),
            'artworks'      => (int) $request->query->get('limitArtworks', 10),
            'adminActions'  => (int) $request->query->get('limitAdminActions', 10),
            'topArtworks'   => (int) $request->query->get('limitTopArtworks', 10),
            'topGalleries'  => (int) $request->query->get('limitTopGalleries', 10),
        ];

        // Sécurité
        foreach ($limits as $key => $value) {
            $limits[$key] = max(5, min($value, 100));
        }

        // Périodes paramétrables (sécurité)
        $daysConnections = (int) $request->query->get('daysConnections', 30);
        $daysConnections = max(7, min($daysConnections, 365));

        $monthsCharts = (int) $request->query->get('monthsCharts', 12);
        $monthsCharts = max(3, min($monthsCharts, 36));

        $daysViews = (int) $request->query->get('daysViews', 30);
        $daysViews = max(7, min($daysViews, 365));

        $data = [
            'kpis' => $this->dashboardService->getKPIs($daysConnections),

            'charts' => [
                // graphiques existants (corrigés)
                'artworksByMonth'          => $this->dashboardService->getArtworksByMonth($monthsCharts),
                'connectionsByDay'         => $this->dashboardService->getConnectionsByDay($daysConnections),
                'artworksDisplayed'        => $this->dashboardService->getArtworksDisplayedStats(),
                'styles'                   => $this->dashboardService->getStylesStats(),
                'nationalities'            => $this->dashboardService->getNationalitiesStats(),
                'ratingsOverTime'          => $this->dashboardService->getRatingsOverTime($monthsCharts),
                'galleriesPublicPrivate'   => $this->dashboardService->getGalleriesPublicPrivate(),

                // ✅ nouveaux graphiques (basés sur les vues journalières)
                'artworkViewsByDay'        => $this->dashboardService->getArtworkViewsByDay($daysViews),
                'galleryViewsByDay'        => $this->dashboardService->getGalleryViewsByDay($daysViews),
            ],

            'tables' => [
                'latestConnections' => $this->dashboardService->getLatestConnections($limits['connections']),
                'latestArtworks'     => $this->dashboardService->getLatestArtworks($limits['artworks']),
                'latestAdminActions' => array_map(
                    fn (array $action) => $this->formatAdminAction($action),
                    $this->dashboardService->getLatestAdminActions($limits['adminActions'])
                ),

                // ✅ nouveaux tableaux de synthèse
                'topArtworksByViews' => $this->dashboardService->getTopArtworksByViews($limits['topArtworks'], $daysViews),
                'topGalleriesByViews'=> $this->dashboardService->getTopGalleriesByViews($limits['topGalleries'], $daysViews),
                'latestRatings'      => $this->dashboardService->getLatestRatings(10),
                'pendingValidations' => $this->dashboardService->getPendingValidationsCounts(),
            ],
        ];

        return $this->json($data);
    }

    private function formatAdminAction(array $action): array
    {
        $entityClass = $action['entity_class'] ?? '';
        $parts = explode('\\', (string) $entityClass);
        $entityName = end($parts) ?: $entityClass;

        $entityId = isset($action['entity_id']) ? (int) $action['entity_id'] : null;

        // Le frontend Angular attend le champ entity_uri pour générer les liens
        $entityUri = null;
        if ($entityId !== null) {
            $entityUri = match ($entityName) {
                'Artwork' => ['/admin/artworks', $entityId],
                'Artist'  => ['/admin/artists', $entityId],
                'Gallery' => ['/admin/galleries', $entityId],
                'User'    => ['/admin/users', $entityId],
                default   => null,
            };
        }

        return [
            'id'         => (int) ($action['id'] ?? 0),
            'action'     => $action['action'] ?? null,
            'entity'     => $entityName,
            'entity_id'  => $entityId,
            'created_at' => $action['created_at'] ?? null,
            'username'   => $action['username'] ?? null,
            'entity_uri' => $entityUri,
        ];
    }
}
