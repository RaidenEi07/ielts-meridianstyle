package com.meridian.question;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Tách nội dung passage (HTML từ TipTap, chỉ có &lt;p&gt; phẳng, không lồng) thành từng đoạn. */
public final class PassageParagraphs {

    private static final Pattern PARAGRAPH =
            Pattern.compile("<p[^>]*>(.*?)</p>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);

    private PassageParagraphs() {
    }

    public static List<String> split(String html) {
        if (html == null || html.isBlank()) {
            return List.of();
        }
        List<String> paragraphs = new java.util.ArrayList<>();
        Matcher m = PARAGRAPH.matcher(html);
        while (m.find()) {
            paragraphs.add(m.group(0));
        }
        return paragraphs;
    }

    /** index 1-based, theo đúng thứ tự &lt;p&gt; trong passage. */
    public static String extract(String html, Integer index) {
        if (index == null || index < 1) {
            return null;
        }
        List<String> paragraphs = split(html);
        if (index > paragraphs.size()) {
            return null;
        }
        return paragraphs.get(index - 1);
    }
}
