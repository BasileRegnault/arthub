<?php

namespace App\Enum;

enum ArtworkType: string
{
    case PAINTING = 'Painting';
    case SCULPTURE = 'Sculpture';
    case DRAWING = 'Drawing';
    case PHOTOGRAPHY = 'Photography';
}