package com.urlshortener.urlshorteningservice.repository;

import com.urlshortener.urlshorteningservice.entity.UrlMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UrlMappingRepository extends JpaRepository<UrlMapping, Long> {
    @Query("SELECT MAX(u.shortCode) FROM UrlMapping u")
    String findMaxShortCode();
}
