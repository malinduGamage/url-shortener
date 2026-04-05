package com.urlshortener.urlshorteningservice.service;

import com.urlshortener.urlshorteningservice.dto.UrlRequest;
import com.urlshortener.urlshorteningservice.dto.UrlResponse;

public interface UrlShorteningService {
    UrlResponse shortUrl(UrlRequest request, java.util.UUID userId);
}
