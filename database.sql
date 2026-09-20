-- ==========================================================================
-- 👑 متجر عطورات ترند (TRAND PERFUMES) - أوامر وسياسات الأمان الشاملة لـ Supabase
-- قم بنسخ هذا الكود بالكامل ولصقه في SQL Editor في لوحة تحكم Supabase والضغط على RUN
-- ==========================================================================

-- 1️⃣ جعل حوض الصور banner-images عاماً (Public) مثل perfume-images
UPDATE storage.buckets 
SET public = true 
WHERE id = 'banner-images';

-- التأكد من وجود الحوضين وتفعيل خاصية Public لهما
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('perfume-images', 'perfume-images', true),
    ('banner-images', 'banner-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;


-- 2️⃣ تفعيل ميزة الأمان (Row Level Security - RLS) على الجدولين
ALTER TABLE public.perfumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;


-- 3️⃣ حذف أي سياسات سابقة لتجنب أي تضارب أو تكرار
DROP POLICY IF EXISTS "Allow public read perfumes" ON public.perfumes;
DROP POLICY IF EXISTS "Allow all operations perfumes" ON public.perfumes;
DROP POLICY IF EXISTS "Allow public read banners" ON public.banners;
DROP POLICY IF EXISTS "Allow all operations banners" ON public.banners;


-- 4️⃣ تطبيق سياسات جدول العطور (perfumes):
-- أ) السماح لجميع زوار المتجر بقراءة وتصفح العطور
CREATE POLICY "Allow public read perfumes" 
ON public.perfumes 
FOR SELECT 
USING (true);

-- ب) السماح للوحة التحكم بإضافة وتعديل وحذف العطور دون أي قيود
CREATE POLICY "Allow all operations perfumes" 
ON public.perfumes 
FOR ALL 
USING (true) 
WITH CHECK (true);


-- 5️⃣ تطبيق سياسات جدول العروض المتحركة (banners):
-- أ) السماح للجميع بقراءة البنرات في الواجهة الرئيسية
CREATE POLICY "Allow public read banners" 
ON public.banners 
FOR SELECT 
USING (true);

-- ب) السماح للوحة التحكم بإضافة وحذف البنرات
CREATE POLICY "Allow all operations banners" 
ON public.banners 
FOR ALL 
USING (true) 
WITH CHECK (true);


-- 6️⃣ تطبيق سياسات رفع وقراءة الصور في مساحات التخزين (Storage Policies):
-- حذف أي سياسات قديمة لأحواض الصور
DROP POLICY IF EXISTS "Allow full storage access for trand" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Perfume Images" ON storage.objects;
DROP POLICY IF EXISTS "Upload Perfume Images" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Banner Images" ON storage.objects;
DROP POLICY IF EXISTS "Upload Banner Images" ON storage.objects;

-- تفعيل سياسة شاملة تسمح برفع وقراءة وحذف صور العطور والبنرات في الحوضين
CREATE POLICY "Allow full storage access for trand" 
ON storage.objects 
FOR ALL 
USING (bucket_id IN ('perfume-images', 'banner-images')) 
WITH CHECK (bucket_id IN ('perfume-images', 'banner-images'));
