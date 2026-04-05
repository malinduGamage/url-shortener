package com.urlshortener.urlshorteningservice.dto;

import java.time.LocalDateTime;

public record UrlResponse(
        String shortCode,       // "abc123"
        String shortUrl,        // "https://short.ly/abc123"
        String longUrl,          // original URL
        LocalDateTime createdAt
) {
}
