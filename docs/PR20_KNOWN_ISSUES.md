## KI-STAFF-UX-01
- Module: Admin Staff
- Type: COSMETIC
- Mô tả: Duplicate username now returns correct 409 conflict, but FE alert still shows generic conflict copy instead of domain-specific Vietnamese message.
- Cách tái hiện: create staff with an existing username.
- Ảnh hưởng: user-facing copy chưa đẹp; không ảnh hưởng correctness.
- Có chặn PR21 không: Không
- Quyết định: defer UI copy polish; backend conflict handling already fixed in PR20.