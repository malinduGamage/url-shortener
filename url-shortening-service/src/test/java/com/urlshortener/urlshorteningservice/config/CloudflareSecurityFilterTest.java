package com.urlshortener.urlshorteningservice.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.io.IOException;
import java.io.PrintWriter;

import static org.mockito.Mockito.*;

class CloudflareSecurityFilterTest {

    private CloudflareSecurityFilter filter;
    private HttpServletRequest request;
    private HttpServletResponse response;
    private FilterChain chain;
    private final String SECRET = "test-secret";

    @BeforeEach
    void setUp() {
        filter = new CloudflareSecurityFilter(SECRET);
        request = mock(HttpServletRequest.class);
        response = mock(HttpServletResponse.class);
        chain = mock(FilterChain.class);
    }

    @Test
    void whenCorrectSecret_thenAllow() throws IOException, ServletException {
        when(request.getRequestURI()).thenReturn("/v1/urls");
        when(request.getHeader("X-Cloudflare-Secret")).thenReturn(SECRET);

        filter.doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
    }

    @Test
    void whenWrongSecret_thenForbidden() throws IOException, ServletException {
        when(request.getRequestURI()).thenReturn("/v1/urls");
        when(request.getHeader("X-Cloudflare-Secret")).thenReturn("wrong-secret");
        when(response.getWriter()).thenReturn(mock(PrintWriter.class));

        filter.doFilter(request, response, chain);

        verify(response).setStatus(HttpServletResponse.SC_FORBIDDEN);
        verify(chain, never()).doFilter(any(), any());
    }

    @Test
    void whenHealthCheck_thenAllow() throws IOException, ServletException {
        when(request.getRequestURI()).thenReturn("/health");

        filter.doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
    }

    @Test
    void whenRoot_thenAllow() throws IOException, ServletException {
        when(request.getRequestURI()).thenReturn("/");

        filter.doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
    }

    @Test
    void whenSecretNotConfigured_thenAllowAll() throws IOException, ServletException {
        CloudflareSecurityFilter openFilter = new CloudflareSecurityFilter("");
        when(request.getRequestURI()).thenReturn("/v1/urls");

        openFilter.doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
    }
}
