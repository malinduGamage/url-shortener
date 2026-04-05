package com.urlshortener.urlshorteningservice.controller;

import com.urlshortener.urlshorteningservice.dto.UrlRequest;
import com.urlshortener.urlshorteningservice.dto.UrlResponse;
import com.urlshortener.urlshorteningservice.service.UrlShorteningService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/urls")
public class UrlShortenerController {
    private final UrlShorteningService urlShorteningService;

    public UrlShortenerController(UrlShorteningService urlShorteningService){
        this.urlShorteningService = urlShorteningService;
    }

    @PostMapping
    public ResponseEntity<UrlResponse> shortenUrl(
            @RequestHeader("X-User-Id") String userId,
            @Validated @RequestBody UrlRequest request){
        UrlResponse response = urlShorteningService.shortUrl(request, java.util.UUID.fromString(userId));
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }
}
