<?php

namespace App\Enum;

enum ArtworkType: string
{
    case PAINTING        = 'Painting';
    case SCULPTURE       = 'Sculpture';
    case DRAWING         = 'Drawing';
    case PHOTOGRAPHY     = 'Photography';
    case PRINT           = 'Print';
    case TEXTILE         = 'Textile';
    case DECORATIVE_ARTS = 'Decorative Arts';
    case CERAMICS        = 'Ceramics';
    case METALWORK       = 'Metalwork';
    case GLASS           = 'Glass';
    case JEWELRY         = 'Jewelry';
    case FURNITURE       = 'Furniture';
    case INSTALLATION    = 'Installation';
    case VIDEO           = 'Video';
    case BOOK            = 'Book';
    case ARCHITECTURE    = 'Architecture';
    case MIXED_MEDIA     = 'Mixed Media';
    case COLLAGE         = 'Collage';
    case WATERCOLOR      = 'Watercolor';
    case PASTEL          = 'Pastel';
}
