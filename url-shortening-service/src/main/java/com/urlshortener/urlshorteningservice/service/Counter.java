package com.urlshortener.urlshorteningservice.service;

import com.urlshortener.urlshorteningservice.repository.UrlMappingRepository;
import jakarta.annotation.PostConstruct;
import lombok.Setter;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicLong;
@Component
@Setter
public class Counter {
    private static final String BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    private final AtomicLong counter = new AtomicLong(1);
    private final UrlMappingRepository repository;

    public Counter(UrlMappingRepository repository) {
        this.repository = repository;
    }

    public String nextId(){
        long num = counter.getAndIncrement();
        return encode(num);
    }

    @PostConstruct
    public void init() {
        String maxShortCode = repository.findMaxShortCode();
        if (maxShortCode != null && !maxShortCode.isBlank()) {
            counter.set(decode(maxShortCode) + 1);
        }
    }

    private String encode(long num){
        StringBuilder encoded = new StringBuilder();
        while(num!=0){
            encoded.append(BASE62.charAt((int) num % 62));
            num /= 62;
        }
        if(encoded.length() < 6) encoded.append("0".repeat(6-encoded.length()));
        return encoded.reverse().toString();
    }

    private long decode(String code) {
        long result = 0;
        for (int i = 0; i < code.length(); i++) {
            int value = BASE62.indexOf(code.charAt(i));
            if (value < 0) {
                throw new IllegalArgumentException("Invalid short code: " + code);
            }
            result = result * 62 + value;
        }
        return result;
    }
}
