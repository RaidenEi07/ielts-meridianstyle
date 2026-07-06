package com.meridian.common;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SlugsTest {

    @Test
    void removesVietnameseDiacriticsAndSpaces() {
        assertThat(Slugs.slugify("Luyện thi IELTS")).isEqualTo("luyen-thi-ielts");
    }

    @Test
    void convertsDinDSpecialCase() {
        assertThat(Slugs.slugify("Đề cương Đọc hiểu")).isEqualTo("de-cuong-doc-hieu");
    }

    @Test
    void collapsesRepeatedSeparatorsAndTrimsDashes() {
        assertThat(Slugs.slugify("  Hello   World!! ")).isEqualTo("hello-world");
    }

    @Test
    void blankInputYieldsEmptyString() {
        assertThat(Slugs.slugify("   ")).isEmpty();
        assertThat(Slugs.slugify(null)).isEmpty();
    }
}
