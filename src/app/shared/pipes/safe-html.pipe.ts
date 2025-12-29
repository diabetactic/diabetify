import { Pipe, PipeTransform, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * SafeHtmlPipe - Sanitizes HTML content to prevent XSS attacks
 *
 * This pipe uses Angular's DomSanitizer with SecurityContext.HTML to sanitize
 * potentially dangerous HTML content before rendering with [innerHTML].
 *
 * Usage:
 *   <p [innerHTML]="content | safeHtml"></p>
 *
 * The pipe sanitizes the HTML by removing potentially dangerous elements and attributes
 * like <script>, onclick handlers, javascript: URLs, etc.
 */
@Pipe({
  name: 'safeHtml',
  standalone: true,
})
export class SafeHtmlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  /**
   * Transforms a string containing HTML into sanitized SafeHtml
   * @param value - The HTML string to sanitize
   * @returns Sanitized HTML string or empty string if sanitization fails
   */
  transform(value: string | null | undefined): SafeHtml {
    if (value === null || value === undefined) {
      return '';
    }

    // Use SecurityContext.HTML to sanitize the content
    // This removes dangerous elements like <script>, dangerous attributes like onclick,
    // and dangerous URLs like javascript:
    const sanitized = this.sanitizer.sanitize(SecurityContext.HTML, value);
    return sanitized || '';
  }
}
