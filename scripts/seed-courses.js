const { Pool } = require('pg');

const SAMPLE_COURSES = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    title: 'Advanced React Patterns & Internal Architecture',
    slug: 'advanced-react-patterns',
    description:
      'Master React under the hood. Build enterprise-grade applications focusing on performance, reusability, and clean architecture.',
    thumbnail:
      'https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=800&auto=format&fit=crop',
    currentPrice: 199,
    originalPrice: 250,
    category: 'Engineering',
    level: 'Advanced',
    duration: '14h 30m',
    videosCount: 42,
    lessonsCount: 14,
    studentsCount: 99,
    rating: '4.90',
    totalRatings: 1240,
    isBestseller: true,
    urgencyText: '3 Spots Left',
    tags: ['React', 'Architecture', 'Performance'],
    videoPreviewUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    requiresForm: false,
    isPublished: true,
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    title: 'UI/UX Design for Software Engineers',
    slug: 'ui-ux-design-for-engineers',
    description:
      'Learn how to design beautiful, intuitive interfaces. Bridge the gap between engineering and design with practical, actionable heuristics.',
    thumbnail:
      'https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=800&auto=format&fit=crop',
    currentPrice: 0,
    originalPrice: 200,
    category: 'Design',
    level: 'Beginner',
    duration: '6h 15m',
    videosCount: 18,
    lessonsCount: 18,
    studentsCount: 210,
    rating: '4.70',
    totalRatings: 856,
    tags: ['Figma', 'Accessibility', 'Design'],
    isBestseller: true,
    requiresForm: false,
    isPublished: true,
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    title: 'Enterprise Architecture with NestJS',
    slug: 'enterprise-nestjs',
    description:
      'Scale your backend services with NestJS. Deep dive into microservices, event-driven architecture, and solid design patterns.',
    thumbnail:
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop',
    currentPrice: 149,
    originalPrice: 200,
    category: 'Backend',
    level: 'Intermediate',
    duration: '22h 45m',
    videosCount: 65,
    lessonsCount: 22,
    studentsCount: 87,
    rating: '4.80',
    totalRatings: 342,
    tags: ['NestJS', 'Microservices', 'Node.js'],
    urgencyText: 'Ends in 5h',
    requiresForm: true,
    isPublished: true,
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    title: 'The Rust Programming Language',
    slug: 'rust-programming',
    description:
      'Systems programming without fear. Memory safety, fearless concurrency, and zero-cost abstractions explained in depth.',
    thumbnail:
      'https://images.unsplash.com/photo-1504639725590-34d0984388bd?q=80&w=800&auto=format&fit=crop',
    currentPrice: 49,
    originalPrice: 99,
    category: 'Systems',
    level: 'Beginner',
    duration: '18h 00m',
    videosCount: 54,
    lessonsCount: 14,
    studentsCount: 312,
    rating: '5.00',
    totalRatings: 2100,
    tags: ['Rust', 'Systems', 'WASM'],
    urgencyText: 'Only 2 left',
    requiresForm: false,
    isPublished: true,
  },
];

async function seedCourses() {
  const connectionString =
    process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/scholarx';

  const pool = new Pool({ connectionString });

  let tableRef = 'courses.courses';

  const tableCheck = await pool.query(`
    SELECT table_schema
    FROM information_schema.tables
    WHERE table_name = 'courses' AND table_schema IN ('courses', 'public')
    ORDER BY CASE WHEN table_schema = 'courses' THEN 0 ELSE 1 END
    LIMIT 1
  `);

  if (tableCheck.rowCount === 0) {
    throw new Error(
      "No 'courses' table found in either courses or public schema",
    );
  }

  tableRef =
    tableCheck.rows[0].table_schema === 'courses'
      ? 'courses.courses'
      : 'public.courses';

  console.log(`Using table: ${tableRef}`);

  const upsertSql = `
    INSERT INTO ${tableRef} (
      id,
      slug,
      title,
      description,
      image_url,
      video_preview_url,
      category,
      level,
      current_price,
      original_price,
      status,
      rating,
      total_ratings,
      duration,
      lessons_count,
      videos_count,
      students_count,
      is_bestseller,
      urgency_text,
      tags,
      requires_form,
      created_at,
      updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12, $13, $14, $15, $16,
      $17, $18, $19, $20, $21, NOW(), NOW()
    )
    ON CONFLICT (slug)
    DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      image_url = EXCLUDED.image_url,
      video_preview_url = EXCLUDED.video_preview_url,
      category = EXCLUDED.category,
      level = EXCLUDED.level,
      current_price = EXCLUDED.current_price,
      original_price = EXCLUDED.original_price,
      status = EXCLUDED.status,
      rating = EXCLUDED.rating,
      total_ratings = EXCLUDED.total_ratings,
      duration = EXCLUDED.duration,
      lessons_count = EXCLUDED.lessons_count,
      videos_count = EXCLUDED.videos_count,
      students_count = EXCLUDED.students_count,
      is_bestseller = EXCLUDED.is_bestseller,
      urgency_text = EXCLUDED.urgency_text,
      tags = EXCLUDED.tags,
      requires_form = EXCLUDED.requires_form,
      updated_at = NOW()
    RETURNING id, slug;
  `;

  try {
    for (const course of SAMPLE_COURSES) {
      const values = [
        course.id,
        course.slug,
        course.title,
        course.description,
        course.thumbnail,
        course.videoPreviewUrl || null,
        course.category,
        course.level,
        course.currentPrice,
        course.originalPrice || null,
        course.isPublished ? 'active' : 'inactive',
        course.rating,
        course.totalRatings,
        course.duration,
        course.lessonsCount,
        course.videosCount,
        course.studentsCount,
        !!course.isBestseller,
        course.urgencyText || null,
        JSON.stringify(course.tags || []),
        !!course.requiresForm,
      ];

      const result = await pool.query(upsertSql, values);
      const row = result.rows[0];
      console.log(`Seeded course: ${row.slug} (${row.id})`);
    }

    console.log(`Done. Seeded ${SAMPLE_COURSES.length} courses.`);
  } finally {
    await pool.end();
  }
}

seedCourses().catch((error) => {
  console.error('Failed to seed courses.');
  console.error('message:', error?.message);
  console.error('code:', error?.code);
  console.error('detail:', error?.detail);
  console.error('stack:', error?.stack);
  process.exit(1);
});
