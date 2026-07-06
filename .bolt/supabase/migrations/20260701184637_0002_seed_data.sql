/*
# Noor Library — Seed Data

## Overview
Populates the marketplace with realistic Islamic eBook content:
- 8 categories (Quran, Hadith, Fiqh, Seerah, Aqeedah, History, Tasawwuf, Children)
- 24 books across categories with covers, descriptions, prices, ratings
- 6 blog posts
- Site settings (site name, hero text, contact info, payment numbers)
- A demo admin user (admin@noorlibrary.bd / Admin@2024) with role=admin in app_metadata

## Notes
1. Books use Pexels stock images for covers (publicly available).
2. PDF file_url points to a sample PDF for demo delivery.
3. Admin user is created via auth.users insert + app_metadata role='admin'.
4. Idempotent: uses ON CONFLICT clauses.
*/

-- ---------- Categories ----------
INSERT INTO public.categories (name, slug, description, icon, color) VALUES
('Quran & Tafsir', 'quran-tafsir', 'Quranic sciences, translations, and tafsir collections.', 'BookOpen', '#047857'),
('Hadith Sciences', 'hadith', 'Collections and studies of prophetic traditions.', 'ScrollText', '#0d9488'),
('Fiqh & Jurisprudence', 'fiqh', 'Islamic law, rulings, and comparative jurisprudence.', 'Scale', '#15803d'),
('Seerah & Biography', 'seerah', 'Life of the Prophet ﷺ and biographies of scholars.', 'User', '#16a34a'),
('Aqeedah & Creed', 'aqeedah', 'Islamic theology and creed.', 'Sparkles', '#059669'),
('Islamic History', 'history', 'History of Islam, caliphates, and civilizations.', 'Landmark', '#65a30d'),
('Tasawwuf & Spirituality', 'tasawwuf', 'Purification of the heart and spiritual development.', 'Heart', '#0f766e'),
('Children & Family', 'children', 'Books for young Muslims and family life.', 'Baby', '#22c55e')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color;

-- ---------- Books ----------
INSERT INTO public.books
  (title, slug, author, description, price, discount_price, category_id, language, pages, publisher, publication_date, file_size, cover_url, preview_url, file_url, rating, review_count, sales_count, is_featured, is_bestseller, is_new_arrival, status)
VALUES
('Tafsir Ibn Kathir (Abridged)', 'tafsir-ibn-kathir', 'Hafiz Ibn Kathir', 'A comprehensive abridgment of the celebrated tafsir, presenting the meanings of the Quran with authentic narrations and clear commentary.', 850, 699, (SELECT id FROM public.categories WHERE slug='quran-tafsir'), 'Bangla', 640, 'Darussalam', '2023-02-10', '12.4 MB', 'https://images.pexels.com/photos/8217425/pexels-photo-8217425.jpeg', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 4.9, 142, 530, true, true, false, 'published'),
('The Noble Quran — Bangla Translation', 'noble-quran-bangla', 'Muhi-ud-Din Al-Hilali & Muhsin Khan', 'A widely acclaimed translation of the meanings of the Noble Quran in Bangla, accompanied by the Arabic text.', 600, null, (SELECT id FROM public.categories WHERE slug='quran-tafsir'), 'Bangla', 920, 'King Fahd Complex', '2022-11-15', '18.2 MB', 'https://images.pexels.com/photos/8217394/pexels-photo-8217394.jpeg', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 4.8, 210, 870, true, true, false, 'published'),
('Sahih al-Bukhari (Bangla)', 'sahih-bukhari-bangla', 'Imam Muhammad al-Bukhari', 'The most authentic book after the Quran, translated into Bangla with brief commentary.', 1200, 999, (SELECT id FROM public.categories WHERE slug='hadith'), 'Bangla', 1280, 'Islamic Foundation', '2023-06-01', '24.6 MB', 'https://images.pexels.com/photos/8217370/pexels-photo-8217370.jpeg', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 5.0, 98, 410, true, true, false, 'published'),
('Riyad as-Saliheen', 'riyad-as-saliheen', 'Imam Nawawi', 'A celebrated collection of authentic hadiths on ethics, worship, and daily life.', 450, 399, (SELECT id FROM public.categories WHERE slug='hadith'), 'Bangla', 480, 'Darussalam', '2023-01-20', '8.1 MB', 'https://images.pexels.com/photos/8217425/pexels-photo-8217425.jpeg', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 4.7, 76, 320, false, true, false, 'published'),
('Fiqh us-Sunnah', 'fiqh-us-sunnah', 'As-Sayyid Sabiq', 'A clear and accessible presentation of Islamic jurisprudence based on authentic sources.', 700, 599, (SELECT id FROM public.categories WHERE slug='fiqh'), 'Bangla', 720, 'International Islamic Publishing House', '2022-09-12', '14.3 MB', 'https://images.pexels.com/photos/8217394/pexels-photo-8217394.jpeg', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 4.6, 54, 210, true, false, true, 'published'),
('Ar-Risalah (Treatise on Fiqh)', 'ar-risalah', 'Imam Al-Shafi''i', 'The foundational text of Shafi''i jurisprudence, a must-read for students of Islamic law.', 550, null, (SELECT id FROM public.categories WHERE slug='fiqh'), 'Arabic', 320, 'Dar Al-Minhaj', '2021-12-01', '6.8 MB', 'https://images.pexels.com/photos/8217370/pexels-photo-8217370.jpeg', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 4.5, 32, 150, false, false, true, 'published'),
('Ar-Raheeq Al-Makhtum', 'raheeq-al-makhtum', 'Safiur-Rahman Mubarakpuri', 'The sealed nectar — an award-winning biography of the Prophet Muhammad ﷺ.', 500, 449, (SELECT id FROM public.categories WHERE slug='seerah'), 'Bangla', 480, 'Darussalam', '2023-03-15', '9.2 MB', 'https://images.pexels.com/photos/8217425/pexels-photo-8217425.jpeg', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 4.9, 187, 640, true, true, false, 'published'),
('Muhammad: His Life Based on Earliest Sources', 'muhammad-earliest-sources', 'Martin Lings', 'A beautifully written biography drawn from the earliest Arabic sources.', 650, 599, (SELECT id FROM public.categories WHERE slug='seerah'), 'English', 360, 'Inner Traditions', '2022-07-22', '7.4 MB', 'https://images.pexels.com/photos/8217394/pexels-photo-8217394.jpeg', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 4.8, 121, 380, false, true, false, 'published'),
('Kitab at-Tawheed', 'kitab-at-tawheed', 'Imam Muhammad bin Abdul Wahhab', 'The classic treatise on Islamic monotheism, with commentary and explanations.', 350, 299, (SELECT id FROM public.categories WHERE slug='aqeedah'), 'Bangla', 280, 'Darussalam', '2023-04-08', '5.6 MB', 'https://images.pexels.com/photos/8217370/pexels-photo-8217370.jpeg', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 4.7, 64, 240, false, true, false, 'published'),
('The Fundamentals of Tawheed', 'fundamentals-tawheed', 'Dr. Abu Ameenah Bilal Philips', 'A clear introduction to the Islamic concept of monotheism.', 400, null, (SELECT id FROM public.categories WHERE slug='aqeedah'), 'English', 240, 'International Islamic Publishing House', '2022-10-05', '4.2 MB', 'https://images.pexels.com/photos/8217425/pexels-photo-8217425.jpeg', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 4.6, 48, 180, false, false, true, 'published'),
('History of Al-Andalus', 'history-al-andalus', 'Dr. Abdul Rahman Ali', 'The rise and fall of Islamic Spain — a richly detailed historical account.', 750, 649, (SELECT id FROM public.categories WHERE slug='history'), 'Bangla', 540, 'Islamic Foundation', '2023-05-18', '11.8 MB', 'https://images.pexels.com/photos/8217394/pexels-photo-8217394.jpeg', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 4.5, 41, 160, false, false, true, 'published'),
('The Caliphates of Islam', 'caliphates-of-islam', 'Hugh Kennedy', 'A sweeping history of the great Islamic empires from the 7th to the 13th century.', 900, 799, (SELECT id FROM public.categories WHERE slug='history'), 'English', 420, 'Basic Books', '2022-08-30', '13.6 MB', 'https://images.pexels.com/photos/8217370/pexels-photo-8217370.jpeg', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 4.4, 36, 130, false, false, false, 'published'),
('Purification of the Heart', 'purification-heart', 'Hamza Yusuf', 'A translation and commentary on Imam al-Mawlud''s poem on spiritual diseases and cures.', 550, 499, (SELECT id FROM public.categories WHERE slug='tasawwuf'), 'English', 220, 'Starlatch Press', '2023-02-28', '5.1 MB', 'https://images.pexels.com/photos/8217425/pexels-photo-8217425.jpeg', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 4.8, 89, 290, true, true, false, 'published'),
('Inner Dimensions of Worship', 'inner-dimensions-worship', 'Imam al-Ghazali', 'From Ihya Ulum al-Din — exploring the inner meanings of Islamic acts of worship.', 480, 429, (SELECT id FROM public.categories WHERE slug='tasawwuf'), 'Bangla', 260, 'Islamic Foundation', '2022-12-10', '6.3 MB', 'https://images.pexels.com/photos/8217394/pexels-photo-8217394.jpeg', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 4.7, 57, 220, false, true, false, 'published'),
('My First Quran', 'my-first-quran', 'Aisha Abdullah', 'A beautifully illustrated introduction to the Quran for young Muslim children.', 300, 249, (SELECT id FROM public.categories WHERE slug='children'), 'Bangla', 120, 'Darussalam', '2023-06-20', '8.9 MB', 'https://images.pexels.com/photos/8217370/pexels-photo-8217370.jpeg', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 4.9, 76, 410, true, true, true, 'published'),
('Stories of the Prophets for Children', 'stories-prophets-children', 'Saniyasnain Khan', 'Engaging retellings of the stories of the prophets for young readers.', 350, 299, (SELECT id FROM public.categories WHERE slug='children'), 'Bangla', 160, 'Goodword Books', '2023-03-30', '10.2 MB', 'https://images.pexels.com/photos/8217425/pexels-photo-8217425.jpeg', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 4.8, 64, 350, false, true, true, 'published'),
('Tafsir al-Jalalayn', 'tafsir-jalalayn', 'Jalal ad-Din al-Mahalli & Jalal ad-Din as-Suyuti', 'The classic concise tafsir of the Holy Quran.', 450, null, (SELECT id FROM public.categories WHERE slug='quran-tafsir'), 'Arabic', 380, 'Dar Al-Kotob Al-Ilmiyah', '2022-05-14', '7.8 MB', 'https://images.pexels.com/photos/8217394/pexels-photo-8217394.jpeg', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 4.4, 28, 110, false, false, false, 'published'),
('Sahih Muslim (Selection)', 'sahih-muslim-selection', 'Imam Muslim', 'Selected authentic hadiths from Sahih Muslim with Bangla translation.', 950, 849, (SELECT id FROM public.categories WHERE slug='hadith'), 'Bangla', 880, 'Islamic Foundation', '2023-07-01', '19.4 MB', 'https://images.pexels.com/photos/8217370/pexels-photo-8217370.jpeg', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 4.8, 52, 190, false, true, false, 'published'),
('Islamic Finance: Principles & Practice', 'islamic-finance', 'Muhammad Taqi Usmani', 'A comprehensive guide to the principles and applications of Islamic finance.', 800, 699, (SELECT id FROM public.categories WHERE slug='fiqh'), 'English', 460, 'Islamic Foundation', '2023-04-22', '10.5 MB', 'https://images.pexels.com/photos/8217425/pexels-photo-8217425.jpeg', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 4.6, 39, 140, false, false, true, 'published'),
('The Sealed Nectar — Companion Edition', 'sealed-nectar-companion', 'Safiur-Rahman Mubarakpuri', 'A companion study guide to Ar-Raheeq Al-Makhtum with maps and timelines.', 400, 349, (SELECT id FROM public.categories WHERE slug='seerah'), 'Bangla', 200, 'Darussalam', '2023-08-15', '6.7 MB', 'https://images.pexels.com/photos/8217394/pexels-photo-8217394.jpeg', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 4.5, 22, 90, false, false, true, 'published'),
('Aqeedat al-Wasitiyyah', 'aqeedat-wasitiyyah', 'Shaykh al-Islam Ibn Taymiyyah', 'The famous creed treatise explaining the beliefs of Ahl as-Sunnah wal-Jama''ah.', 380, 329, (SELECT id FROM public.categories WHERE slug='aqeedah'), 'Bangla', 240, 'Darussalam', '2022-11-28', '5.4 MB', 'https://images.pexels.com/photos/8217370/pexels-photo-8217370.jpeg', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 4.7, 31, 120, false, false, false, 'published'),
('The Crusades Through Arab Eyes', 'crusades-arab-eyes', 'Amin Maalouf', 'A renowned history of the Crusades from the Muslim perspective.', 700, 599, (SELECT id FROM public.categories WHERE slug='history'), 'English', 320, 'Saqi Books', '2022-06-10', '8.3 MB', 'https://images.pexels.com/photos/8217425/pexels-photo-8217425.jpeg', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 4.5, 44, 170, false, false, false, 'published'),
('The Alchemy of Happiness', 'alchemy-happiness', 'Imam al-Ghazali', 'A timeless classic on the spiritual path to inner peace and divine love.', 420, 379, (SELECT id FROM public.categories WHERE slug='tasawwuf'), 'Bangla', 280, 'Islamic Foundation', '2023-01-08', '6.0 MB', 'https://images.pexels.com/photos/8217394/pexels-photo-8217394.jpeg', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 4.6, 53, 200, false, false, true, 'published'),
('Islamic Manners for Kids', 'islamic-manners-kids', 'Fatima Salem', 'A fun, illustrated guide teaching children Islamic etiquette and daily adhkar.', 280, 249, (SELECT id FROM public.categories WHERE slug='children'), 'Bangla', 100, 'Goodword Books', '2023-09-01', '7.2 MB', 'https://images.pexels.com/photos/8217370/pexels-photo-8217370.jpeg', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 4.8, 41, 230, false, true, true, 'published')
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  author = EXCLUDED.author,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  discount_price = EXCLUDED.discount_price,
  category_id = EXCLUDED.category_id,
  language = EXCLUDED.language,
  pages = EXCLUDED.pages,
  publisher = EXCLUDED.publisher,
  publication_date = EXCLUDED.publication_date,
  file_size = EXCLUDED.file_size,
  cover_url = EXCLUDED.cover_url,
  rating = EXCLUDED.rating,
  review_count = EXCLUDED.review_count,
  sales_count = EXCLUDED.sales_count,
  is_featured = EXCLUDED.is_featured,
  is_bestseller = EXCLUDED.is_bestseller,
  is_new_arrival = EXCLUDED.is_new_arrival,
  status = EXCLUDED.status;

-- ---------- Blog Posts ----------
INSERT INTO public.blog_posts (title, slug, excerpt, content, cover_url, author, category, tags, status, published_at) VALUES
('The Importance of Seeking Knowledge in Islam', 'importance-seeking-knowledge', 'A reflection on the Quranic command to seek knowledge and its place in the life of a Muslim.', 'In the name of Allah, the Most Gracious, the Most Merciful.

The pursuit of knowledge is among the highest forms of worship in Islam. The very first revelation to the Prophet Muhammad ﷺ was a command to read: "Read in the name of your Lord who created." (Quran 96:1)

Throughout Islamic history, scholars have held a revered position. The Quran elevates those who possess knowledge: "Are those who know equal to those who do not know?" (Quran 39:9). This rhetorical question underscores the immense value placed on learning.

Seeking knowledge is not limited to religious sciences. The early Muslims excelled in medicine, mathematics, astronomy, and philosophy — all seen as ways to understand the creation of Allah and serve humanity.

In our time, access to authentic Islamic knowledge has never been easier. Digital libraries, eBooks, and online courses allow every Muslim to study the Quran, Hadith, Fiqh, and Seerah from the comfort of their home.

At Noor Library, we are committed to making authentic Islamic literature accessible to Muslims in Bangladesh and around the world. Our curated collection includes works from renowned scholars, translated into Bangla and English for the benefit of all.

May Allah grant us beneficial knowledge and the ability to act upon it.', 'https://images.pexels.com/photos/8217425/pexels-photo-8217425.jpeg', 'Noor Library Editorial', 'Articles', ARRAY['knowledge','quran','education'], 'published', now()),
('How to Build a Daily Quran Reading Habit', 'daily-quran-habit', 'Practical steps to connect with the Quran every single day, no matter how busy you are.', 'The Quran is the word of Allah, revealed as guidance for all of humanity. Building a daily connection with it is one of the most rewarding habits a Muslim can cultivate.

Here are some practical tips:

1. Start Small — Even a few verses a day is a beginning. The Prophet ﷺ said the most beloved deeds to Allah are those done consistently, even if small.

2. Choose a Fixed Time — Early morning after Fajr is ideal, but any consistent time works.

3. Read with Understanding — Use a translation in your language. Noor Library offers several excellent Bangla and English translations.

4. Reflect — Pause on verses that touch your heart. The Quran is meant to be pondered, not just recited.

5. Journal — Write down insights, questions, and reflections.

6. Find a Partner — Reading with a friend or family member creates accountability.

7. Use Technology — eBooks and apps make the Quran accessible anywhere.

Remember, the goal is not speed but connection. A single verse understood and acted upon is better than a juz read without reflection.

May Allah make us among the people of the Quran.', 'https://images.pexels.com/photos/8217394/pexels-photo-8217394.jpeg', 'Noor Library Editorial', 'Guides', ARRAY['quran','habits','spirituality'], 'published', now()),
('Understanding the Science of Hadith', 'science-of-hadith', 'An introduction to how scholars preserved and authenticated the sayings of the Prophet ﷺ.', 'The science of hadith (Mustalah al-Hadith) is one of the most rigorous disciplines developed by Muslim scholars to preserve the words and actions of the Prophet Muhammad ﷺ.

After the Quran, the hadith are the most important source of Islamic guidance. But how do we know which reports are authentic? This is where the science of hadith comes in.

The scholars developed a sophisticated system to evaluate narrations based on two main factors:

1. The Chain of Narrators (Isnad) — Each person in the chain is evaluated for memory, character, and reliability. A single weak link disqualifies the entire narration.

2. The Text (Matn) — The content is examined for consistency with the Quran, other authentic hadith, and historical facts.

Based on these evaluations, hadith are classified as:
- Sahih (Authentic) — Highest grade
- Hasan (Good) — Reliable but slightly lower
- Da''if (Weak) — Has defects
- Mawdu (Fabricated) — Forged

The six most authentic collections (Kutub as-Sittah) are:
1. Sahih al-Bukhari
2. Sahih Muslim
3. Sunan Abu Dawud
4. Sunan at-Tirmidhi
5. Sunan an-Nasa''i
6. Sunan Ibn Majah

Noor Library offers authentic editions of these collections in Bangla and English, allowing you to study the words of the Prophet ﷺ with confidence in their authenticity.', 'https://images.pexels.com/photos/8217370/pexels-photo-8217370.jpeg', 'Noor Library Editorial', 'Education', ARRAY['hadith','scholars','islam'], 'published', now()),
('The Life of the Prophet: Lessons for Today', 'prophet-life-lessons', 'Timeless lessons from the Seerah that we can apply in our modern lives.', 'The life of Prophet Muhammad ﷺ is a complete model for humanity. In every stage of his life — as a merchant, husband, father, leader, and statesman — there are lessons that transcend time.

Compassion — The Prophet ﷺ was known as "the trustworthy" (al-Amin) even before prophethood. His kindness to children, the elderly, and animals set a standard we should emulate.

Patience in Adversity — From the persecution in Makkah to the loss of loved ones, the Prophet ﷺ demonstrated unwavering patience. He taught that whatever befalls a believer is expiation for sins.

Justice — As a leader, he applied justice equally to friend and foe. When a noblewoman from Banu Makhzum stole, he insisted the law be applied, saying "Even if Fatima stole, I would cut her hand."

Family — He helped with household chores, was gentle with his wives, and played with his grandchildren. His example rebukes both extremes of harshness and neglect.

Community — He built a society based on brotherhood, where the rich helped the poor and the strong protected the weak.

Studying the Seerah is not an academic exercise — it is a journey of transformation. At Noor Library, we offer several excellent biographies to help you walk in the footsteps of the beloved Prophet ﷺ.', 'https://images.pexels.com/photos/8217425/pexels-photo-8217425.jpeg', 'Noor Library Editorial', 'Seerah', ARRAY['prophet','seerah','lessons'], 'published', now()),
('Ramadan Preparation: A Complete Guide', 'ramadan-preparation-guide', 'Prepare your heart, home, and habits for the most blessed month of the year.', 'Ramadan is the month of fasting, prayer, and Quran. To make the most of it, preparation is essential.

Spiritual Preparation:
- Increase voluntary worship before Ramadan
- Repent and seek forgiveness
- Make a dua list
- Choose a Quran reading plan

Practical Preparation:
- Stock up on healthy suhoor and iftar foods
- Adjust your sleep schedule gradually
- Plan your work and study commitments
- Prepare your family, especially children

Knowledge Preparation:
- Learn the fiqh of fasting
- Study the virtues of Ramadan
- Read books on spiritual development

Noor Library has curated a special Ramadan collection featuring books on fasting, Quran study, and spiritual development. Whether you are a new Muslim or a lifelong student of knowledge, you will find resources to deepen your Ramadan experience.

May Allah allow us to reach Ramadan and accept our worship.', 'https://images.pexels.com/photos/8217394/pexels-photo-8217394.jpeg', 'Noor Library Editorial', 'Guides', ARRAY['ramadan','fasting','spirituality'], 'published', now()),
('Raising Children with Islamic Values', 'raising-children-islamic-values', 'Practical advice for parents on nurturing faith, character, and love of Islam in children.', 'Children are a trust (amanah) from Allah. Raising them with Islamic values is one of the most important responsibilities of parenthood.

Lead by Example — Children learn more from what they see than what they are told. Let them see you pray, read Quran, and practice good character.

Make Islam Joyful — Celebrate Islamic occasions, tell them stories of the prophets, and make the mosque a welcoming place.

Establish Daily Adhkar — Teach them morning and evening remembrances from a young age.

Quran as a Companion — Even 10 minutes a day of Quran together builds a lifelong bond.

Choose Good Companions — The Prophet ﷺ said a person follows the religion of their friend, so be careful who you befriend.

Protect from Harmful Influences — Monitor screen time and content. Fill their hearts with good before others fill them with bad.

Make Du''a — Ultimately, guidance is from Allah. Pray for your children daily.

Noor Library offers a growing collection of children''s books to help you plant the seeds of faith in young hearts.', 'https://images.pexels.com/photos/8217370/pexels-photo-8217370.jpeg', 'Noor Library Editorial', 'Family', ARRAY['children','family','parenting'], 'published', now())
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  content = EXCLUDED.content,
  cover_url = EXCLUDED.cover_url,
  author = EXCLUDED.author,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  status = EXCLUDED.status;

-- ---------- Coupons ----------
INSERT INTO public.coupons (code, type, value, min_order, max_uses, used_count, valid_until, is_active) VALUES
('NOOR10', 'percentage', 10, 200, 1000, 0, now() + interval '1 year', true),
('WELCOME50', 'fixed', 50, 300, 500, 0, now() + interval '6 months', true),
('RAMADAN20', 'percentage', 20, 500, 2000, 0, now() + interval '3 months', true)
ON CONFLICT (code) DO NOTHING;

-- ---------- Settings ----------
INSERT INTO public.settings (key, value) VALUES
('site_name', 'Noor Library'),
('site_tagline', 'Premium Islamic eBooks'),
('hero_title', 'Authentic Islamic Knowledge, Delivered Instantly'),
('hero_subtitle', 'Discover a curated collection of authentic Islamic eBooks. Pay with bKash, Nagad, Rocket, or SSLCommerz and download instantly.'),
('contact_email', 'hello@noorlibrary.bd'),
('contact_phone', '+880 1700-000000'),
('address', 'Dhaka, Bangladesh'),
('bkash_number', '01700-000000'),
('nagad_number', '01700-000000'),
('rocket_number', '01700-000000'),
('facebook_url', 'https://facebook.com/noorlibrary'),
('youtube_url', 'https://youtube.com/@noorlibrary'),
('footer_about', 'Noor Library is Bangladesh''s premier marketplace for authentic Islamic eBooks. We are committed to making knowledge accessible to every Muslim.')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
