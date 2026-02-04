# Questions for IHMS

Open questions and concerns that need to be addressed before production deployment.

---

## 1. Sink Product Images

**Status:** Open

**Context:**
The demo currently uses sink images downloaded from manufacturer websites (Ruvati, Native Trails, American Standard). These images are suitable for development and demo purposes only.

**Questions:**
- Will IHMS have its own product catalog with proprietary images?
- If using manufacturer images, what licensing agreements are needed?
- Should we implement an image upload feature for admins to manage product photos?
- What image hosting solution should be used in production? (e.g., AWS S3, Cloudflare R2, Cloudinary)

**Current Implementation:**
- 15 images stored locally in `apps/web/public/images/sinks/`
- Images are referenced by relative URL in the database (`/images/sinks/filename.jpg`)

**Options for Production:**
1. **Self-hosted** - Upload images to cloud storage, store full URLs in database
2. **Manufacturer CDN** - Link directly to manufacturer product images (requires permission)
3. **Admin upload feature** - Build UI for uploading/managing product images
4. **Stock photos** - Purchase commercially licensed sink photos

---

*Add new questions below as they arise.*
