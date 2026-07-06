# syntax=docker/dockerfile:1

# ---------- Build stage ----------
FROM eclipse-temurin:17-jdk AS build
WORKDIR /app

# Cache dependency download theo lớp riêng (chỉ tải lại khi pom.xml đổi).
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B dependency:go-offline

COPY src ./src
RUN ./mvnw -B -DskipTests package && \
    cp target/backend-*.jar app.jar

# ---------- Runtime stage ----------
FROM eclipse-temurin:17-jre
WORKDIR /app
RUN useradd --system --create-home meridian
USER meridian

COPY --from=build --chown=meridian:meridian /app/app.jar app.jar

EXPOSE 8090
ENV SERVER_PORT=8090
ENTRYPOINT ["java", "-jar", "app.jar"]
