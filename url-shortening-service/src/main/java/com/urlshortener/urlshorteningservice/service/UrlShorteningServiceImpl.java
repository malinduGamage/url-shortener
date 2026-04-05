package com.urlshortener.urlshorteningservice.service;

import com.urlshortener.urlshorteningservice.dto.UrlRequest;
import com.urlshortener.urlshorteningservice.dto.UrlResponse;
import com.urlshortener.urlshorteningservice.entity.UrlMapping;
import com.urlshortener.urlshorteningservice.repository.UrlMappingRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class UrlShorteningServiceImpl implements UrlShorteningService{
    private final Counter counter;
    private final UrlMappingRepository repository;

    public UrlShorteningServiceImpl(Counter counter, UrlMappingRepository repository){
        this.counter = counter;
        this.repository = repository;
    }

    public void saveUrl(String code, String longUrl, java.util.UUID userId) {
        UrlMapping mapping = new UrlMapping();
        mapping.setShortCode(code);
        mapping.setLongUrl(longUrl);
        mapping.setUserId(userId);
        repository.save(mapping);
    }

    @Override
    public UrlResponse shortUrl(UrlRequest request, java.util.UUID userId) {
        String longUrl = request.longUrl();
        String shortCode = counter.nextId();
        String shortUrl = "/v1/urls/" + shortCode;

        saveUrl(shortCode,longUrl, userId);

        return new UrlResponse(shortCode,shortUrl,longUrl, LocalDateTime.now());
    }
}
