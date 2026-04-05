package com.urlshortener.urlshorteningservice.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class CloudflareSecurityFilter implements Filter {

    private final String expectedSecret;

    public CloudflareSecurityFilter(@Value("${CLOUDFLARE_ORIGIN_SECRET:}") String expectedSecret) {
        this.expectedSecret = expectedSecret;
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String path = httpRequest.getRequestURI();
        
        // Skip security check for local testing (missing secret) or health checks
        if (expectedSecret == null || expectedSecret.isEmpty() || 
            path.equals("/") || path.equals("/health") || path.startsWith("/actuator")) {
            chain.doFilter(request, response);
            return;
        }

        String clientSecret = httpRequest.getHeader("X-Cloudflare-Secret");
        
        if (expectedSecret.equals(clientSecret)) {
            chain.doFilter(request, response);
        } else {
            httpResponse.setStatus(HttpServletResponse.SC_FORBIDDEN);
            httpResponse.setContentType("application/json");
            httpResponse.getWriter().write("{\"error\": \"Direct access forbidden: Traffic must flow through Cloudflare Gateway\"}");
        }
    }
}
