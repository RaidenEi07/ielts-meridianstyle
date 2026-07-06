package com.meridian.user;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {

    @Query("SELECT u FROM User u WHERE lower(u.email) = lower(:email)")
    Optional<User> findByEmailIgnoreCase(@Param("email") String email);

    boolean existsByEmailIgnoreCase(String email);

    @Query("SELECT u FROM User u WHERE lower(u.username) = lower(:username)")
    Optional<User> findByUsernameIgnoreCase(@Param("username") String username);

    boolean existsByUsernameIgnoreCase(String username);

    @Query("SELECT u FROM User u WHERE "
            + "lower(u.fullName) LIKE lower(concat('%', :q, '%')) OR "
            + "lower(u.username) LIKE lower(concat('%', :q, '%')) OR "
            + "lower(u.email) LIKE lower(concat('%', :q, '%'))")
    List<User> search(@Param("q") String q);
}
