-- =====================================================
-- Discover Videos 数据迁移脚本
-- 生成时间: 2025-10-31T09:49:49.651Z
-- 数据条数: 81
-- =====================================================

INSERT INTO discover_videos (
  prompt,
  video_url,
  image_url,
  category,
  status,
  is_featured,
  display_order,
  created_at
) VALUES
  (
    'animate the image',
    'https://static.vidfab.ai/user-video/vidfab-2910ad47-9d15-4ab4-8a59-aea9cf2500d8.mp4',
    'https://static.vidfab.ai/user-image/vidfab-2910ad47-9d15-4ab4-8a59-aea9cf2500d8.webp',
    'abstract',
    'active',
    false,
    1000,
    NOW() - INTERVAL '0 days'
  ),
  (
    'A blonde woman stands in dim water, surrounded by multiple floating red roses. She slowly reaches her hand into the water, picking up a floating red rose, with water ripples gently swaying with her hand movements. The background features soft lighting, illuminating the vibrant colors of the roses. The camera captures the scene from a slightly downward frontal angle, focusing on the action and water ripple details.',
    'https://static.vidfab.ai/user-video/vidfab-cc5fedd1-507a-4415-bef7-7bfe1d3e8c49.mp4',
    'https://static.vidfab.ai/user-image/vidfab-cc5fedd1-507a-4415-bef7-7bfe1d3e8c49.webp',
    'cinematic',
    'active',
    false,
    999,
    NOW() - INTERVAL '1 days'
  ),
  (
    'A young boy with blond hair and a yellow scarf, wearing a blue robe, is holding a vividly colored rose in his hand. He naturally floats up and down in the air, his scarf gently waving as if blown by the wind. Rose petals detach from the rose and softly float around him. The environment features a mystical, space-like background with colorful ribbons of light gracefully floating around, and stars in the background gently twinkling. The camera is fixed in place, capturing the entire scene from a medium distance.',
    'https://static.vidfab.ai/user-video/vidfab-18f88fc8-b716-4766-9d99-19cadea0a78c.mp4',
    'https://static.vidfab.ai/user-image/vidfab-18f88fc8-b716-4766-9d99-19cadea0a78c.webp',
    'fantasy',
    'active',
    false,
    998,
    NOW() - INTERVAL '2 days'
  ),
  (
    'A glass-like textured bottle suspended mid-air begins to drop gently towards the water''s surface. As it touches the water, ripples and a mild splash form, with sunlight reflecting off the surface. Background is minimal and clean, emphasizing the water''s texture. The camera is fixed slightly above, capturing the falling motion and water interaction from an overhead angle.',
    'https://static.vidfab.ai/user-video/vidfab-336a09f9-94e4-47c2-9131-8a00d1fdec6d.mp4',
    'https://static.vidfab.ai/user-image/vidfab-336a09f9-94e4-47c2-9131-8a00d1fdec6d.webp',
    'abstract',
    'active',
    false,
    997,
    NOW() - INTERVAL '3 days'
  ),
  (
    'A lively meadow scene with flowers and green leaves swaying visibly in the wind against a clear blue sky. An astronaut in a white space suit raises their arm, attempting to reach for a yellow butterfly, but hesitates and stops midway. The butterfly flutters gracefully, moving between flowers, as the camera follows its motion afterward. The shot remains steady with no zooming in or changing perspective.',
    'https://static.vidfab.ai/user-video/vidfab-66b5448f-56aa-4617-971b-455131516817.mp4',
    'https://static.vidfab.ai/user-image/vidfab-66b5448f-56aa-4617-971b-455131516817.webp',
    'nature',
    'active',
    false,
    996,
    NOW() - INTERVAL '4 days'
  ),
  (
    'The camera gently pans from left to right, capturing a warm, softly lit indoor setting with a minimalistic design. A textured white table with metallic legs and a vase of white flowers is initially in focus. The frame gradually reveals a plush leather chair to the side and a large abstract painting hanging on the wall. The room''s color palette consists of soft beige tones, creating a calm and cozy ambiance.',
    'https://static.vidfab.ai/user-video/vidfab-94280875-2418-4d8e-a7d4-11bf7412f7fd.mp4',
    'https://static.vidfab.ai/user-image/vidfab-94280875-2418-4d8e-a7d4-11bf7412f7fd.webp',
    'abstract',
    'active',
    false,
    995,
    NOW() - INTERVAL '5 days'
  ),
  (
    'The astronaut dozes off, simulating the human dozing motion. The scenery in the window accelerates from right to left, simulating the subway scenery.',
    'https://static.vidfab.ai/user-video/vidfab-5cce9ba1-1931-4d9c-aa6e-6841ff129797.mp4',
    'https://static.vidfab.ai/user-image/vidfab-5cce9ba1-1931-4d9c-aa6e-6841ff129797.webp',
    'fantasy',
    'active',
    false,
    994,
    NOW() - INTERVAL '6 days'
  ),
  (
    'Mermaid sheds tears, tears turn into pearls, she dives into the water, swimming underwater',
    'https://static.vidfab.ai/user-video/vidfab-d532167c-1ed9-4799-8cd4-fb48d1701745.mp4',
    'https://static.vidfab.ai/user-image/vidfab-d532167c-1ed9-4799-8cd4-fb48d1701745.webp',
    'technology',
    'active',
    false,
    993,
    NOW() - INTERVAL '7 days'
  ),
  (
    'A person in a dark hoodie stands on rain-soaked deserted train tracks in a dystopian city. In the distance, a large hovering red glowing eye stares at them. Slowly, the eye blinks and completely closes. The person then suddenly runs forward with determination, splashing water under their feet. The environment is gloomy with barren buildings, light rain, and wet reflective surfaces. The camera is positioned low behind the individual, slightly zooming in during the motion.',
    'https://static.vidfab.ai/user-video/vidfab-5648e60a-78ea-42d2-8442-360840e1cc7e.mp4',
    'https://static.vidfab.ai/user-image/vidfab-5648e60a-78ea-42d2-8442-360840e1cc7e.webp',
    'cinematic',
    'active',
    false,
    992,
    NOW() - INTERVAL '8 days'
  ),
  (
    'Multiple daisy flowers surrounding jars and a glass vase gently sway back and forth, their petals moving with a soft breeze. The shifting light causes the shadows of the flowers, jars, and vase to move subtly on the marble surface. The scene is professionally composed on a bright marble table, with sunlight creating soft highlights and shadows. The camera remains stationary, capturing the scene from a slightly tilted overhead angle, perfectly showcasing the premium setup.',
    'https://static.vidfab.ai/user-video/vidfab-94870e88-9d46-4f9c-8d17-bf9dd3473c27.mp4',
    'https://static.vidfab.ai/user-image/vidfab-94870e88-9d46-4f9c-8d17-bf9dd3473c27.webp',
    'cinematic',
    'active',
    false,
    991,
    NOW() - INTERVAL '9 days'
  ),
  (
    'Butterflies flutter gracefully, and fireflies glow softly in the air. A child sits atop a giant golden fish, holding a fishing rod and playfully swaying it. The majestic fish leaps across the river''s surface, carrying the child on its back. Gentle ripples spread with each jump, shimmering under the warm, magical light. The scene is filled with a dreamlike atmosphere, blending fantasy and wonder.',
    'https://static.vidfab.ai/user-video/vidfab-f12daa09-d38c-41e9-9f0e-36758e5c0d0b.mp4',
    'https://static.vidfab.ai/user-image/vidfab-f12daa09-d38c-41e9-9f0e-36758e5c0d0b.webp',
    'technology',
    'active',
    false,
    990,
    NOW() - INTERVAL '10 days'
  ),
  (
    'A Chinchilla cat looks down at the shredded potatoes in the pan, holding a spatula in one hand and supporting the pan handle with the other. The cat stir-fries the shredded potatoes in the pan, flipping them left and right, while the hand holding the pan handle tosses the pan up and down. The movements are smooth and natural, creating a realistic cooking scene.',
    'https://static.vidfab.ai/user-video/vidfab-a6b26e8b-fcf6-4dab-9814-3fcfe5d93b45.mp4',
    'https://static.vidfab.ai/user-image/vidfab-a6b26e8b-fcf6-4dab-9814-3fcfe5d93b45.webp',
    'abstract',
    'active',
    false,
    989,
    NOW() - INTERVAL '11 days'
  ),
  (
    'Butterflies flying',
    'https://static.vidfab.ai/user-video/vidfab-5aff6321-3a8a-4cff-b8ed-f2f224f9570e.mp4',
    'https://static.vidfab.ai/user-image/vidfab-5aff6321-3a8a-4cff-b8ed-f2f224f9570e.webp',
    'abstract',
    'active',
    false,
    988,
    NOW() - INTERVAL '12 days'
  ),
  (
    'A young woman with long black hair wearing a white shirt sits indoors, her expression is playful and mischievous. She gently sticks out her tongue with a slight smile, showing a cute and teasing look. The camera remains fixed in a front-facing view, maintaining focus on the woman''s face for a clear depiction of the tongue movement.',
    'https://static.vidfab.ai/user-video/vidfab-f98e5d07-0ba0-44e4-ab9b-28cdb0b7fe24.mp4',
    'https://static.vidfab.ai/user-image/vidfab-f98e5d07-0ba0-44e4-ab9b-28cdb0b7fe24.webp',
    'portrait',
    'active',
    false,
    987,
    NOW() - INTERVAL '13 days'
  ),
  (
    'A woman wearing a futuristic, blue-green cyberpunk outfit walks into the frame from off-screen and sits down on a vibrant green, clear inflatable sofa, leaning back to showcase its softness and comfort. The scene takes place in a minimally lit industrial space with large windows allowing soft natural light to flow in. The camera is positioned at mid-range, slightly below eye level, capturing the interaction in a professional, dynamic ad style with smooth motion tracking. Ultra-clear quality with natural human dynamics.',
    'https://static.vidfab.ai/user-video/vidfab-5cdaa640-2fe8-4070-a8ee-aa4aaed62242.mp4',
    'https://static.vidfab.ai/user-image/vidfab-5cdaa640-2fe8-4070-a8ee-aa4aaed62242.webp',
    'cinematic',
    'active',
    false,
    986,
    NOW() - INTERVAL '14 days'
  ),
  (
    'Woman controlling flames, fire burning, forming a heart shape in the air, exploding,4K',
    'https://static.vidfab.ai/user-video/vidfab-2f94c6d7-b404-4ecc-afdd-e699748ca0c5.mp4',
    'https://static.vidfab.ai/user-image/vidfab-2f94c6d7-b404-4ecc-afdd-e699748ca0c5.webp',
    'portrait',
    'active',
    false,
    985,
    NOW() - INTERVAL '15 days'
  ),
  (
    'A girl with vibrant artistic makeup and a bouquet of flowers slowly opens her eyes and looks at the camera. The scene has a textured, abstract blue background with yellow-green lighting. The girl is softly illuminated with close-up detail, and the camera is fixed in a front-facing position.',
    'https://static.vidfab.ai/user-video/vidfab-113ef8ff-a468-4d9c-8ef9-c72b7a1636da.mp4',
    'https://static.vidfab.ai/user-image/vidfab-113ef8ff-a468-4d9c-8ef9-c72b7a1636da.webp',
    'cinematic',
    'active',
    false,
    984,
    NOW() - INTERVAL '16 days'
  ),
  (
    'The warrior is walking',
    'https://static.vidfab.ai/user-video/vidfab-2d66b8f5-b8a6-4d7c-ba3c-9e1047a9eb08.mp4',
    'https://static.vidfab.ai/user-image/vidfab-2d66b8f5-b8a6-4d7c-ba3c-9e1047a9eb08.webp',
    'abstract',
    'active',
    false,
    983,
    NOW() - INTERVAL '17 days'
  ),
  (
    'A gray-haired chair in a cozy room gradually transforms, with fur growing and its legs and frame reshaping into those of a werewolf. The werewolf stands in the middle of the warm-lit room, raising its head, opening its mouth, and letting out a deep growl. The background remains steady with a bookshelf, wooden flooring, and sunlight streaming in through the windows. The camera remains stationary, capturing the transformation from a medium-close angle.',
    'https://static.vidfab.ai/user-video/vidfab-b5fba292-7376-4ee0-a287-8b8596b1ae01.mp4',
    'https://static.vidfab.ai/user-image/vidfab-b5fba292-7376-4ee0-a287-8b8596b1ae01.webp',
    'technology',
    'active',
    false,
    982,
    NOW() - INTERVAL '18 days'
  ),
  (
    'Plants sway gently in the rhythmic motion of the wind. Flowers break away from the plants one by one, floating downward, with some landing on the scoop of ice cream while others drift out of view. The background is simple and blurred to draw attention to the interaction between the flowers and the ice cream. The camera is fixed on the ice cream with a static angle, simulating the natural dynamics of flowers falling on ice cream.',
    'https://static.vidfab.ai/user-video/vidfab-6cdde798-4009-4604-8621-ea7ae85c9824.mp4',
    'https://static.vidfab.ai/user-image/vidfab-6cdde798-4009-4604-8621-ea7ae85c9824.webp',
    'cinematic',
    'active',
    false,
    981,
    NOW() - INTERVAL '19 days'
  ),
  (
    'A satellite equipped with solar panels orbits the Earth in the vastness of space. The Earth slowly rotates towards the camera, revealing the Earth''s curvature and atmospheric clouds. The satellite moves smoothly along its orbit, making tiny angular adjustments to track the Earth. The camera slowly rotates, capturing details of the satellite and the curvature of the Earth. In the background is a dark expanse of space, illuminated by distant stars and the sunlight that bathes the Earth.',
    'https://static.vidfab.ai/user-video/vidfab-f381ec51-3c26-48f9-82a6-b68e20d6e15e.mp4',
    'https://static.vidfab.ai/user-image/vidfab-f381ec51-3c26-48f9-82a6-b68e20d6e15e.webp',
    'technology',
    'active',
    false,
    980,
    NOW() - INTERVAL '20 days'
  ),
  (
    'A lit candle inside a detailed ceramic holder with floral patterns. The candle flame flickers gently while smoke rises smoothly in a natural motion. The environment is warm and atmospheric, with soft lighting. Decorative flowers and greenery are scattered around, adding a natural and tranquil tone. The camera is close-up and slightly elevated, focusing on the candle holder with a soft blur in the background for a professional advertisement effect.',
    'https://static.vidfab.ai/user-video/vidfab-cb012594-5f36-4e24-8914-4d552ead1ef2.mp4',
    'https://static.vidfab.ai/user-image/vidfab-cb012594-5f36-4e24-8914-4d552ead1ef2.webp',
    'cinematic',
    'active',
    false,
    979,
    NOW() - INTERVAL '21 days'
  ),
  (
    'A cat starts in a resting position on the top platform of a multi-level cat tree, then rises gracefully and jumps down to the ground in one agile and natural motion. The camera angle captures the action professionally to emphasize the stability of the cat tree while showcasing the dynamic and natural movement of the cat. The background is a softly lit indoor space with a beige wall, a curtain on the left, and a wooden cabinet on the right. The scene is shot in 4K resolution, with smooth motion that adheres to realistic feline behavior patterns.',
    'https://static.vidfab.ai/user-video/vidfab-daaacef1-2344-45e5-968c-1e460ccf42f0.mp4',
    'https://static.vidfab.ai/user-image/vidfab-daaacef1-2344-45e5-968c-1e460ccf42f0.webp',
    'cinematic',
    'active',
    false,
    978,
    NOW() - INTERVAL '22 days'
  ),
  (
    'A warm and bright laundry room, with sunlight streaming through the window and green plants along with wooden decor creating a cozy environment. A washing machine is silently positioned within. 1-2 seconds: A close-up shot shows the washing machine quietly in place, sunlight enhancing the calming household atmosphere. 2-4 seconds: A medium shot captures the user placing clothes into the machine, adding detergent, closing the door, adjusting the knob, and pressing start—efficient and natural. 4-6 seconds: A close-up reveals the washing machine drum spinning smoothly, with clothes gently tumbling in the water, maintaining a quiet and steady operation. 6-8 seconds: A side or overhead shot showcases the laundry room, with stationary objects such as table cups and plants, emphasizing the machine''s vibration-free performance. 8-10 seconds: A medium shot shows the user opening the washing machine door, smiling, and taking out clean, soft clothes, folding them neatly in the serene and cozy environment.',
    'https://static.vidfab.ai/user-video/vidfab-f03fedb4-b15a-46c0-9210-bd9e65ade873.mp4',
    'https://static.vidfab.ai/user-image/vidfab-f03fedb4-b15a-46c0-9210-bd9e65ade873.webp',
    'nature',
    'active',
    false,
    977,
    NOW() - INTERVAL '23 days'
  ),
  (
    'Hyperrealistic: Photorealistic:The fairy sits gracefully on a snow-covered branch, surrounded by shimmering icy icicles. She slowly rises, her movements fluid and elegant. Her delicate wings unfold, glowing softly with an icy light. With a gentle flutter, she leaps from the branch, and a swirl of sparkling snowflakes and magical glimmers bursts around her.In mid-flight, her wings leave behind a glowing trail, resembling frosty patterns in the air. Her dress and flowing hair ripple gently with the motion. The camera follows her ascent, capturing the enchanting flight as she hovers in mid-air, surrounded by whirling snowflakes, creating a magical and dreamlike atmosphere.',
    'https://static.vidfab.ai/user-video/vidfab-74c7f150-0072-4396-97cf-dc80f1a75513.mp4',
    'https://static.vidfab.ai/user-image/vidfab-74c7f150-0072-4396-97cf-dc80f1a75513.webp',
    'fantasy',
    'active',
    false,
    976,
    NOW() - INTERVAL '24 days'
  ),
  (
    'A stylish boy wearing ski gear reaches into the frame from below with one hand, picks up the ski goggles, and smoothly places them on his head. He then grabs a snowboard and makes a ''V'' hand gesture while smiling. Snowflakes gently fall in the bright snowy environment, with concrete structures in the background. The camera starts at a lower angle, focusing on the hand entering, then dynamically follows to capture the full sequence in a professional advertisement style with smooth transitions.',
    'https://static.vidfab.ai/user-video/vidfab-bc7e2fe1-97ed-4584-8561-5bb8b6180132.mp4',
    'https://static.vidfab.ai/user-image/vidfab-bc7e2fe1-97ed-4584-8561-5bb8b6180132.webp',
    'cinematic',
    'active',
    false,
    975,
    NOW() - INTERVAL '25 days'
  ),
  (
    'The ball in front of the cat floats up and down, the cat yawns gracefully, the cat''s hair floats slightly, the perspective remains unchanged, beautiful and gentle',
    'https://static.vidfab.ai/user-video/vidfab-fb4a22f6-0253-43ac-a675-d427264d2fe2.mp4',
    'https://static.vidfab.ai/user-image/vidfab-fb4a22f6-0253-43ac-a675-d427264d2fe2.webp',
    'technology',
    'active',
    false,
    974,
    NOW() - INTERVAL '26 days'
  ),
  (
    'In heavy snow, a Russian woman gently strokes the mane of a white lion. The lion extends its tongue and licks the woman''s face affectionately. Shot in 4K, high definition, with exquisite detail and cinematography.',
    'https://static.vidfab.ai/user-video/vidfab-30bcb9f4-1b7b-4541-bd52-ed7d1831bf2c.mp4',
    'https://static.vidfab.ai/user-image/vidfab-30bcb9f4-1b7b-4541-bd52-ed7d1831bf2c.webp',
    'portrait',
    'active',
    false,
    973,
    NOW() - INTERVAL '27 days'
  ),
  (
    'Flat oil painting texture, simulating the dynamic movement of goldfish swimming around',
    'https://static.vidfab.ai/user-video/vidfab-86566b34-8ac0-46e7-9dec-131bc9669c08.mp4',
    'https://static.vidfab.ai/user-image/vidfab-86566b34-8ac0-46e7-9dec-131bc9669c08.webp',
    'abstract',
    'active',
    false,
    972,
    NOW() - INTERVAL '28 days'
  ),
  (
    'In an outdoor setting, flowers in the foreground sway gently in the wind while a person behind them gradually lifts their hand towards the sky. The camera remains static, capturing the scene from a steady front-facing angle.',
    'https://static.vidfab.ai/user-video/vidfab-512ef404-640f-4384-afb6-6451a9e55fb7.mp4',
    'https://static.vidfab.ai/user-image/vidfab-512ef404-640f-4384-afb6-6451a9e55fb7.webp',
    'nature',
    'active',
    false,
    971,
    NOW() - INTERVAL '29 days'
  ),
  (
    'A silver and black analog camera sits on a reflective surface in a bright modern office. A man picks up the camera with his hands and turns it to inspect it, showing the fine details of the camera''s construction. The whole scene then switches to a close-up of a hand holding a printed photo. Focusing the photo, the picture zooms in to an attractive young woman sitting at a desk, working in a professional modern office, with the background softly blurred. High-quality professional advertising-grade 4K video with smooth transitions and sharp focus.',
    'https://static.vidfab.ai/user-video/vidfab-29213994-a459-448d-9f70-1207c95b570a.mp4',
    'https://static.vidfab.ai/user-image/vidfab-29213994-a459-448d-9f70-1207c95b570a.webp',
    'cinematic',
    'active',
    false,
    970,
    NOW() - INTERVAL '30 days'
  ),
  (
    'A boy in a white shirt stands in front of a lamp post, holding a bouquet of roses. He smiled and slowly extends one rose from the bouquet toward the camera. The camera remains fixed in front of the boy, focusing on the gesture and capturing details of the transition.',
    'https://static.vidfab.ai/user-video/vidfab-f54a8f17-ed3e-4764-985a-85081da4dbfa.mp4',
    'https://static.vidfab.ai/user-image/vidfab-f54a8f17-ed3e-4764-985a-85081da4dbfa.webp',
    'portrait',
    'active',
    false,
    969,
    NOW() - INTERVAL '31 days'
  ),
  (
    'A black cartoon-style cat with large expressive green eyes peers around a turquoise wall, staring directly at the camera. As the video progresses, its tail slowly appears from beneath the wall, swaying gently. The environment is drawn in a flat picture-book style with soft pastel green and turquoise tones. The camera remains static in a frontal view.',
    'https://static.vidfab.ai/user-video/vidfab-e8c70c49-f6cb-462f-9cf2-c8271dfbf325.mp4',
    'https://static.vidfab.ai/user-image/vidfab-e8c70c49-f6cb-462f-9cf2-c8271dfbf325.webp',
    'technology',
    'active',
    false,
    968,
    NOW() - INTERVAL '32 days'
  ),
  (
    'Cat waves wand,Harry Potter style, magical effects, 4K, ultra HD, detailed, highly refined',
    'https://static.vidfab.ai/user-video/vidfab-4cc22572-404e-4f8c-a639-a41ad751c234.mp4',
    'https://static.vidfab.ai/user-image/vidfab-4cc22572-404e-4f8c-a639-a41ad751c234.webp',
    'technology',
    'active',
    false,
    967,
    NOW() - INTERVAL '33 days'
  ),
  (
    'A black cat with wide eyes sits at a desk in an office engulfed in flames in the background. The cat first holds a coffee cup in one paw, taking a slow sip before placing it back on the table. Next, the cat positions its paws on the keyboard and types slowly, occasionally glancing at the computer monitor. The office background remains lit with warm colors from the fire. The camera captures a medium close-up angle, showing the cat''s calm demeanor amidst the dramatic setting.',
    'https://static.vidfab.ai/user-video/vidfab-3d070281-0c2d-4801-b970-d23117c4ddcd.mp4',
    'https://static.vidfab.ai/user-image/vidfab-3d070281-0c2d-4801-b970-d23117c4ddcd.webp',
    'lifestyle',
    'active',
    false,
    966,
    NOW() - INTERVAL '34 days'
  ),
  (
    'A futuristic gaming mouse hovers up and down slowly in mid-air above a glowing circular platform with neon lights. The scene is inside a sci-fi station with a backdrop of space, including a starry sky and floating asteroids. The camera is positioned in an angled close-up view, tracking the mouse''s motion with steadiness.',
    'https://static.vidfab.ai/user-video/vidfab-68682289-6924-43fd-9306-ad33bfe92b05.mp4',
    'https://static.vidfab.ai/user-image/vidfab-68682289-6924-43fd-9306-ad33bfe92b05.webp',
    'technology',
    'active',
    false,
    965,
    NOW() - INTERVAL '35 days'
  ),
  (
    'People smile warmly and hug each other affectionately, creating a heartwarming scene filled with joy and connection.',
    'https://static.vidfab.ai/user-video/vidfab-b2c098c3-8cf8-4380-9642-d9bed8c0e523.mp4',
    'https://static.vidfab.ai/user-image/vidfab-b2c098c3-8cf8-4380-9642-d9bed8c0e523.webp',
    'portrait',
    'active',
    false,
    964,
    NOW() - INTERVAL '36 days'
  ),
  (
    'In a futuristic city with a misty atmosphere and towering spire-like buildings in the background, multiple futuristic cars fly forward in the same direction at a synchronized speed, maintaining consistent distances and ensuring no collisions. The vehicles are illuminated by neon purple and blue lights, and the large central tree is visible in the scene. The camera remains static to capture the uniform motion of the vehicles in a symmetrical composition.',
    'https://static.vidfab.ai/user-video/vidfab-600932d5-1915-4f00-96ee-2402f3348be6.mp4',
    'https://static.vidfab.ai/user-image/vidfab-600932d5-1915-4f00-96ee-2402f3348be6.webp',
    'technology',
    'active',
    false,
    963,
    NOW() - INTERVAL '37 days'
  ),
  (
    'An orange tabby cat is clutching a dinosaur egg tightly while sprinting toward the camera with a panicked expression. Behind it, a ferocious T-Rex roars angrily at the fleeing cat.',
    'https://static.vidfab.ai/user-video/vidfab-33f75def-89db-4ce9-b37a-6f70706c198a.mp4',
    'https://static.vidfab.ai/user-image/vidfab-33f75def-89db-4ce9-b37a-6f70706c198a.webp',
    'cinematic',
    'active',
    false,
    962,
    NOW() - INTERVAL '38 days'
  ),
  (
    'A white fluffy dog wearing a leather biker outfit and goggles is riding a motorcycle. The motorcycle''s wheels rotate counterclockwise. The background expands, revealing more of an urban cityscape with tall buildings and a bright, dramatic sunset. The camera starts with the dog slightly off-center and slowly zooms out and repositions to bring the dog and motorcycle to the center of the frame.',
    'https://static.vidfab.ai/user-video/vidfab-19029012-2eb6-4ea5-be43-089c6adee8b1.mp4',
    'https://static.vidfab.ai/user-image/vidfab-19029012-2eb6-4ea5-be43-089c6adee8b1.webp',
    'cinematic',
    'active',
    false,
    961,
    NOW() - INTERVAL '39 days'
  ),
  (
    'The camera rotates horizontally to the right, smoothly capturing the serene dreamlike cityscape with its pastel architecture, domed structures, and glowing light fixtures. The water surface displays gentle ripples that interact with the soft illumination, creating a shimmering effect. Clouds drift naturally across the sky from left to right, enhancing the picturesque quality. As the camera pans, new structures consistent with the original style emerge on the right, extending the fantastical ambiance with glowing elements and intricate architecture.',
    'https://static.vidfab.ai/user-video/vidfab-fa03d336-6d90-48f8-b400-a5cc15857eb5.mp4',
    'https://static.vidfab.ai/user-image/vidfab-fa03d336-6d90-48f8-b400-a5cc15857eb5.webp',
    'nature',
    'active',
    false,
    960,
    NOW() - INTERVAL '40 days'
  ),
  (
    'Three scuba divers are swimming underwater near a large, calm shark. One diver reacts with surprise, flailing momentarily, while the other two notice and swim closer. The divers gather together and gesture to communicate, then swim slowly away from the shark. The underwater environment is serene, with sunlight streaming through the water''s surface, casting a soft blue glow. The camera is positioned below and angled upward, highlighting the scale of the shark and the dramatic lighting from above.',
    'https://static.vidfab.ai/user-video/vidfab-5aabf497-c66b-4157-8713-73e873609152.mp4',
    'https://static.vidfab.ai/user-image/vidfab-5aabf497-c66b-4157-8713-73e873609152.webp',
    'nature',
    'active',
    false,
    959,
    NOW() - INTERVAL '41 days'
  ),
  (
    'A European or American woman wearing professional attire walks into the scene carrying a briefcase, then slumps and reclines onto the watermelon-shaped sofa, highlighting its softness and comfort. The scene depicts a modern, stylish living room with vibrant curtains, abstract lighting, and pastel tones in the background. The camera remains steady with a fixed angle, maintaining a professional commercial perspective that emphasizes the sofa''s detail and the natural movement of the woman. Super high-definition video with smooth and realistic body dynamics.',
    'https://static.vidfab.ai/user-video/vidfab-d1e996a7-fc3c-4d6e-b270-7490aead14e7.mp4',
    'https://static.vidfab.ai/user-image/vidfab-d1e996a7-fc3c-4d6e-b270-7490aead14e7.webp',
    'cinematic',
    'active',
    false,
    958,
    NOW() - INTERVAL '42 days'
  ),
  (
    'A large, detailed spaceship moves forward through a glowing, circular time-space gate surrounded by metallic infrastructure. The glowing portal illuminates the futuristic scene, with Earth visible in the background and soft clouds floating below. The camera is positioned in front of the spaceship, slightly below the center, capturing its gradual movement forward in high detail as the portal''s bright light reflects off the ship''s metallic surface.',
    'https://static.vidfab.ai/user-video/vidfab-9179f814-1763-4740-bed6-bb009adcba2c.mp4',
    'https://static.vidfab.ai/user-image/vidfab-9179f814-1763-4740-bed6-bb009adcba2c.webp',
    'fantasy',
    'active',
    false,
    957,
    NOW() - INTERVAL '43 days'
  ),
  (
    'A butterfly flies erratically in various directions, flapping its wings quickly and changing orientation. Meanwhile, an astronaut takes slow, careful steps toward a mountain, slightly tilting their body as if inspecting something. The background shows a vast rocky terrain with a mountain in the distance under a clear blue sky. The camera starts with a medium shot capturing both the butterfly and astronaut, then slowly tracks the astronaut as they move closer to the mountain.',
    'https://static.vidfab.ai/user-video/vidfab-350ff83c-44ff-4db1-8365-12d6e1e0d157.mp4',
    'https://static.vidfab.ai/user-image/vidfab-350ff83c-44ff-4db1-8365-12d6e1e0d157.webp',
    'nature',
    'active',
    false,
    956,
    NOW() - INTERVAL '44 days'
  ),
  (
    'Hyper speed pov shot zooms across a chaotic battlefield, dodging explosions, shrapnel and gunfire as this soldier sprints in front of the camera, weaving through smoke, rubble and explosions, the environment blurring in rapid motion as chaos erupts all around him',
    'https://static.vidfab.ai/user-video/vidfab-2713d1aa-cf79-486b-bf4f-0a9914f10ed3.mp4',
    'https://static.vidfab.ai/user-image/vidfab-2713d1aa-cf79-486b-bf4f-0a9914f10ed3.webp',
    'cinematic',
    'active',
    false,
    955,
    NOW() - INTERVAL '45 days'
  ),
  (
    'A pair of hands plays a black piano decorated with delicate gold ornaments. The right hand in the frame presses the piano keys smoothly, and the other left hand joins in as the right hand switches to play the piano on the right side, maintaining natural movement. The background is a warm traditional interior with Chinese calligraphy scrolls and decorations. The gold particles float naturally in the air and move gently, adding to the artistic atmosphere. The camera is slightly above and to the side of the piano, capturing the hand movements and instrument in 4K ultra-clear quality with a fixed angle of view.',
    'https://static.vidfab.ai/user-video/vidfab-ef35eeeb-dee4-4810-a9ad-728955998481.mp4',
    'https://static.vidfab.ai/user-image/vidfab-ef35eeeb-dee4-4810-a9ad-728955998481.webp',
    'abstract',
    'active',
    false,
    954,
    NOW() - INTERVAL '46 days'
  ),
  (
    'A transparent chair stands stationary on a calm water surface with delicate ripples. The background is illuminated by soft, natural light under a clear sky. The camera slowly zooms in, keeping the chair centered as water ripples gently move across the surface.',
    'https://static.vidfab.ai/user-video/vidfab-8d27ef24-39e2-4c1f-9f85-3c05b7cd0bc2.mp4',
    'https://static.vidfab.ai/user-image/vidfab-8d27ef24-39e2-4c1f-9f85-3c05b7cd0bc2.webp',
    'nature',
    'active',
    false,
    953,
    NOW() - INTERVAL '47 days'
  ),
  (
    'Anime girl reaches out from the screen, holding hands with the hand outside the screen.',
    'https://static.vidfab.ai/user-video/vidfab-2eac1d61-e20e-4116-9bc5-1f36bf6fb9c9.mp4',
    'https://static.vidfab.ai/user-image/vidfab-2eac1d61-e20e-4116-9bc5-1f36bf6fb9c9.webp',
    'portrait',
    'active',
    false,
    952,
    NOW() - INTERVAL '48 days'
  ),
  (
    'Animate the image',
    'https://static.vidfab.ai/user-video/vidfab-c05e67c2-336c-4428-aad3-ccff5444496a.mp4',
    'https://static.vidfab.ai/user-image/vidfab-c05e67c2-336c-4428-aad3-ccff5444496a.webp',
    'abstract',
    'active',
    false,
    951,
    NOW() - INTERVAL '49 days'
  ),
  (
    'The motorcycle accelerates and performs circular drifts in a wet urban environment at dusk, splashing water and creating a vivid effect of movement. The neon lights of the surrounding futuristic buildings illuminate the scene, showing reflective details on the wet ground. The camera transitions a dynamic tracking shot following the acrobatic curves of the motorcycle, emphasizing the speed and complex mechanical craftsmanship of the motorcycle. Slow motion and cinematic highlights mimic the effect of a high-energy motorcycle commercial. The action matches the natural movement of the human body, and the motorcycle matches the laws of natural movement.',
    'https://static.vidfab.ai/user-video/vidfab-2dcebef5-ec13-4e11-a979-25ff92fbef05.mp4',
    'https://static.vidfab.ai/user-image/vidfab-2dcebef5-ec13-4e11-a979-25ff92fbef05.webp',
    'cinematic',
    'active',
    false,
    950,
    NOW() - INTERVAL '50 days'
  ),
  (
    'Masterful cinematography, a beautiful woman, first sways hips to the right, then to the left, then jumps into a trending dance, cute expression, vertical tilt camera movement, realistic human motion, lifelike visuals, smooth animation, vivid details, soft and consistent lighting.',
    'https://static.vidfab.ai/user-video/vidfab-93bed41a-4745-4b77-bca4-4371117237b1.mp4',
    'https://static.vidfab.ai/user-image/vidfab-93bed41a-4745-4b77-bca4-4371117237b1.webp',
    'cinematic',
    'active',
    false,
    949,
    NOW() - INTERVAL '51 days'
  ),
  (
    'An animated fluffy white dog with a red collar joyfully descends from the sky onto a large fluffy cloud. The dog lands gracefully, sending small puffs of cloud upward. After landing, it turns its head toward the camera with a cheerful expression and wags its tail. Then, the dog leaps forward toward a higher cloud, showing playful energy. The background is a dreamy blue sky with fluffy white clouds illuminated by soft, warm light. The camera follows the dog''s movements, starting wide, zooming in slightly to capture its expressions, then zooming out to follow its leap.',
    'https://static.vidfab.ai/user-video/vidfab-02978690-262f-4b30-b406-b1d05e882c63.mp4',
    'https://static.vidfab.ai/user-image/vidfab-02978690-262f-4b30-b406-b1d05e882c63.webp',
    'cinematic',
    'active',
    false,
    948,
    NOW() - INTERVAL '52 days'
  ),
  (
    'A Siberian Husky facing the camera, with the camera smoothly panning around in a full circle.',
    'https://static.vidfab.ai/user-video/vidfab-d418b4be-e8cc-4c35-845e-16d7f1f40b45.mp4',
    'https://static.vidfab.ai/user-image/vidfab-d418b4be-e8cc-4c35-845e-16d7f1f40b45.webp',
    'cinematic',
    'active',
    false,
    947,
    NOW() - INTERVAL '53 days'
  ),
  (
    'move',
    'https://static.vidfab.ai/user-video/vidfab-ff87e475-44b0-48c1-a0b2-54e218cba858.mp4',
    'https://static.vidfab.ai/user-image/vidfab-ff87e475-44b0-48c1-a0b2-54e218cba858.webp',
    'abstract',
    'active',
    false,
    946,
    NOW() - INTERVAL '54 days'
  ),
  (
    'An astronaut in a full space suit is seated at a grand white piano on the moon''s surface. The astronaut''s hands dynamically move over the piano keys, simulating realistic human-like playing. The Earth, visible in the background, rotates gradually to the right under a starry sky. The camera remains fixed at a slightly angled side view, capturing the astronaut, piano, and the Earth rotation in one consistent static frame. Ensure smooth motion transitions over 10 seconds.',
    'https://static.vidfab.ai/user-video/vidfab-83d7d447-3a33-4bd1-8471-ab6d5a5179e5.mp4',
    'https://static.vidfab.ai/user-image/vidfab-83d7d447-3a33-4bd1-8471-ab6d5a5179e5.webp',
    'fantasy',
    'active',
    false,
    945,
    NOW() - INTERVAL '55 days'
  ),
  (
    'A car is moving forward on the road, leaving the roadside scenery behind',
    'https://static.vidfab.ai/user-video/vidfab-5d574636-ba8b-4a2e-b25a-e0ffa3226fc3.mp4',
    'https://static.vidfab.ai/user-image/vidfab-5d574636-ba8b-4a2e-b25a-e0ffa3226fc3.webp',
    'vehicles',
    'active',
    false,
    944,
    NOW() - INTERVAL '56 days'
  ),
  (
    'A male model walks confidently on a fashion catwalk, his steps firm and slightly swaying, exuding charm. His deep eyes look teasingly forward, accompanied by a subtle smile, as he occasionally touches his collar or lifts the hem of his clothes gracefully. The camera follows him from a low angle, capturing his elegant and powerful movements on a glowing golden runway backdrop with abstract lighting.',
    'https://static.vidfab.ai/user-video/vidfab-dc54fefd-344f-4b8d-9d07-bd66ab1202f0.mp4',
    'https://static.vidfab.ai/user-image/vidfab-dc54fefd-344f-4b8d-9d07-bd66ab1202f0.webp',
    'cinematic',
    'active',
    false,
    943,
    NOW() - INTERVAL '57 days'
  ),
  (
    'A natural outdoor scene featuring a serene lake or ocean at sunset. The camera slowly moves forward, showing trees on both sides with leaves swaying noticeably in the wind. An orange circular sun gradually sinks into the water, while the waves crash forward energetically. The lighting creates warm, orange reflections on the water''s surface.',
    'https://static.vidfab.ai/user-video/vidfab-a39bd67e-8d57-4701-bc0c-335435dd5efa.mp4',
    'https://static.vidfab.ai/user-image/vidfab-a39bd67e-8d57-4701-bc0c-335435dd5efa.webp',
    'nature',
    'active',
    false,
    942,
    NOW() - INTERVAL '58 days'
  ),
  (
    'The planet on top of the stone statue rotates slowly, while the stone statue gradually closes its eyes. Below, a small figure takes a few steps backward, causing ripples to spread across the water surface with detailed wave patterns. The camera maintains a level perspective and slowly focuses in on the small figure, capturing the subtle movements and water details.',
    'https://static.vidfab.ai/user-video/vidfab-fe4d8875-7ab6-4b91-96b3-547b2f3eae6d.mp4',
    'https://static.vidfab.ai/user-image/vidfab-fe4d8875-7ab6-4b91-96b3-547b2f3eae6d.webp',
    'portrait',
    'active',
    false,
    941,
    NOW() - INTERVAL '59 days'
  ),
  (
    'A large reptilian monster with spiked back slowly looks left, then right, turning its massive head. Suddenly, it quickly turns toward the camera, opening its large mouth wide and roaring fiercely, revealing sharp teeth. The camera simulates a human perspective, trembling subtly at first but violently shaking as the monster roars. The camera then drops to the ground, facing upward. The environment is a destroyed urban setting with tall, crumbling buildings, debris scattered around, and a faint blue glow adding an ominous atmosphere.',
    'https://static.vidfab.ai/user-video/vidfab-26cc80d9-9ba8-47c0-abb5-6732ecdd344b.mp4',
    'https://static.vidfab.ai/user-image/vidfab-26cc80d9-9ba8-47c0-abb5-6732ecdd344b.webp',
    'technology',
    'active',
    false,
    940,
    NOW() - INTERVAL '60 days'
  ),
  (
    'A pink quilted handbag with a golden clasp and pearl handle dangles gently in the center, showcasing intricate details in a stable manner. In the background, pearls and diamonds fall gradually and naturally onto a glittery ground. The scene is set against a bright blue sky with soft clouds, colorful ribbons, and sparkling accents. The camera remains fixed and stable.',
    'https://static.vidfab.ai/user-video/vidfab-68bed557-a35f-48e3-b24c-4df144bb4f5f.mp4',
    'https://static.vidfab.ai/user-image/vidfab-68bed557-a35f-48e3-b24c-4df144bb4f5f.webp',
    'nature',
    'active',
    false,
    939,
    NOW() - INTERVAL '61 days'
  ),
  (
    'Raccoon looking around, head tilting, paw movements, head lift, happy smile, warm sunlight, soft lighting, high-resolution, realistic style, steady camera, smooth motion, cinematic 4K ultra-clear quality.',
    'https://static.vidfab.ai/user-video/vidfab-83902e34-9546-4095-a5fa-9ab8f1ebf00b.mp4',
    'https://static.vidfab.ai/user-image/vidfab-83902e34-9546-4095-a5fa-9ab8f1ebf00b.webp',
    'cinematic',
    'active',
    false,
    938,
    NOW() - INTERVAL '62 days'
  ),
  (
    'Panda holding bamboo, eating bamboo',
    'https://static.vidfab.ai/user-video/vidfab-0766276e-67ea-4593-b201-bff0b7f0d471.mp4',
    'https://static.vidfab.ai/user-image/vidfab-0766276e-67ea-4593-b201-bff0b7f0d471.webp',
    'nature',
    'active',
    false,
    937,
    NOW() - INTERVAL '63 days'
  ),
  (
    'A giant gray tabby cat walks forward slowly through a destroyed urban city street, looking directly ahead with a firm gaze. Its tail sways slightly as it moves. The background reveals a dystopian city with destroyed buildings, scattered rubble, and cars either parked or moving on the sides of the road. The atmosphere is gloomy with dark, overcast clouds, and birds circle the ruins in the distance. The camera is positioned at ground level in the center of the street with a slight upward tilt, capturing the cat''s towering presence as it advances.',
    'https://static.vidfab.ai/user-video/vidfab-1d960458-3e30-4fc8-a0fa-5bbe3afe220a.mp4',
    'https://static.vidfab.ai/user-image/vidfab-1d960458-3e30-4fc8-a0fa-5bbe3afe220a.webp',
    'nature',
    'active',
    false,
    936,
    NOW() - INTERVAL '64 days'
  ),
  (
    'A silver-haired woman in ornate armor stands beside a white dragon in a snowy mountain landscape. The woman gently turns her head to the side, gazing at the dragon, and slowly raises her hand to rest it on her sword or the dragon''s snout. The dragon lowers its head, blinking slowly, and exhales a soft icy mist. Snowflakes fall gently in the background, with soft daylight illuminating the scene. The camera remains focused on a medium close-up of the woman and the dragon, slightly shifting angles to show their interaction.',
    'https://static.vidfab.ai/user-video/vidfab-5212ab21-6673-449e-ac46-0a74e395adc8.mp4',
    'https://static.vidfab.ai/user-image/vidfab-5212ab21-6673-449e-ac46-0a74e395adc8.webp',
    'portrait',
    'active',
    false,
    935,
    NOW() - INTERVAL '65 days'
  ),
  (
    'A block-style character with a green and yellow pixelated hat, blue eyes, and a pipe decorated with flowers in their mouth. The character slowly turns their head to the left, then to the right, while exhaling small puffs of smoke from the pipe. The background features a swirly, starry pattern with a Van Gogh-inspired aesthetic, predominantly blue with yellow accents. The camera remains static, capturing the character from the chest upward in high detail.',
    'https://static.vidfab.ai/user-video/vidfab-1a3bef62-8fe4-4545-be5d-88345a2f8c52.mp4',
    'https://static.vidfab.ai/user-image/vidfab-1a3bef62-8fe4-4545-be5d-88345a2f8c52.webp',
    'technology',
    'active',
    false,
    934,
    NOW() - INTERVAL '66 days'
  ),
  (
    'A blue and white Ford Mustang car gradually transforms from a particle state into a real car, speeding on the road',
    'https://static.vidfab.ai/user-video/vidfab-aebb6641-a9ab-4edc-8614-4fefdb440136.mp4',
    'https://static.vidfab.ai/user-image/vidfab-aebb6641-a9ab-4edc-8614-4fefdb440136.webp',
    'vehicles',
    'active',
    false,
    933,
    NOW() - INTERVAL '67 days'
  ),
  (
    'A woman with traditional Asian-style attire and accessories is depicted in a serene twilight blue environment. Her expression remains calm as she blinks slowly, her head gently tilts to the right, and her long hair sways lightly in the breeze. The background features faint architectural elements, softly illuminated. The camera remains stationary, positioned directly in front of the subject, focusing on her upper body and facial expression with a slight close-up.',
    'https://static.vidfab.ai/user-video/vidfab-bb817471-f8d2-4835-b9ac-5b6e492f7f5a.mp4',
    'https://static.vidfab.ai/user-image/vidfab-bb817471-f8d2-4835-b9ac-5b6e492f7f5a.webp',
    'portrait',
    'active',
    false,
    932,
    NOW() - INTERVAL '68 days'
  ),
  (
    'A futuristic sports car is positioned in the center of a cyberpunk city street. The rear lights flicker twice before the car begins driving forward slowly and smoothly. The wet street reflects neon orange and teal lighting, while futuristic buildings and signage add depth to the background. The camera remains stationary behind the car, slightly angled downward to emphasize the road''s texture and reflections.',
    'https://static.vidfab.ai/user-video/vidfab-1839ad35-5cf3-4322-9d76-1b17c30b567a.mp4',
    'https://static.vidfab.ai/user-image/vidfab-1839ad35-5cf3-4322-9d76-1b17c30b567a.webp',
    'technology',
    'active',
    false,
    931,
    NOW() - INTERVAL '69 days'
  ),
  (
    'background petals floating,water flowing, perfume bottle sparkling, 4K ultra-clear,Fixed camera',
    'https://static.vidfab.ai/user-video/vidfab-6b8ed914-fd36-4597-a316-9cea733de33d.mp4',
    'https://static.vidfab.ai/user-image/vidfab-6b8ed914-fd36-4597-a316-9cea733de33d.webp',
    'cinematic',
    'active',
    false,
    930,
    NOW() - INTERVAL '70 days'
  ),
  (
    'A man wearing a Hawaiian shirt stands at a beach grilling station. He picks up a frothy beer mug from the grill with one hand, holding it up dramatically before taking a satisfying sip. The background shows a sunny beach with gentle waves and golden sand. Sizzling skewers of meat cook on the grill, while additional beer bottles sit nearby. The camera captures the scene from a slightly low angle with a professional beer advertisement perspective, focusing sharply on the man and the beer while softly blurring the beach and ocean in the distance.',
    'https://static.vidfab.ai/user-video/vidfab-6435c766-2727-479e-9e19-ef292d262493.mp4',
    'https://static.vidfab.ai/user-image/vidfab-6435c766-2727-479e-9e19-ef292d262493.webp',
    'cinematic',
    'active',
    false,
    929,
    NOW() - INTERVAL '71 days'
  ),
  (
    'A young woman with styled blonde hair adorned with a floral headpiece and wearing a vintage polka-dot outfit starts with her head tilted slightly, then raises her right hand to wave gently while smiling sweetly. The camera is positioned at eye level, capturing a medium-close shot of her upper torso and face.',
    'https://static.vidfab.ai/user-video/vidfab-f71f2c85-51c5-4e3e-9f24-1bc1580a38cc.mp4',
    'https://static.vidfab.ai/user-image/vidfab-f71f2c85-51c5-4e3e-9f24-1bc1580a38cc.webp',
    'portrait',
    'active',
    false,
    928,
    NOW() - INTERVAL '72 days'
  ),
  (
    'On a cyberpunk street, a racer riding a motorcycle, speeding forward',
    'https://static.vidfab.ai/user-video/vidfab-38f3be38-fd52-4766-8f1b-cb807d2dbf98.mp4',
    'https://static.vidfab.ai/user-image/vidfab-38f3be38-fd52-4766-8f1b-cb807d2dbf98.webp',
    'technology',
    'active',
    false,
    927,
    NOW() - INTERVAL '73 days'
  ),
  (
    'A man in a black feather-decorated coat stands in a forest of dead trees, looking firmly into the distance. The feathers on his coat sway gently in the wind. Several crows fly in the background, gradually moving away and disappearing out of the frame. The background is a gray sky and dead trees, adding to the gloomy atmosphere. The camera starts from a medium shot and gradually zooms in to the man''s face, ending with a close-up that highlights his facial details as well as the somber mood.',
    'https://static.vidfab.ai/user-video/vidfab-ba6d346c-5c3d-435f-9a6c-fa153ddf5272.mp4',
    'https://static.vidfab.ai/user-image/vidfab-ba6d346c-5c3d-435f-9a6c-fa153ddf5272.webp',
    'cinematic',
    'active',
    false,
    926,
    NOW() - INTERVAL '74 days'
  ),
  (
    'A panda stands in the kitchen, holding a seasoning bottle next to the frying steak. It sprinkles seasoning on the steak in a slow and deliberate manner.',
    'https://static.vidfab.ai/user-video/vidfab-d9a14c88-453e-4062-8f3c-69b6ceee84ac.mp4',
    'https://static.vidfab.ai/user-image/vidfab-d9a14c88-453e-4062-8f3c-69b6ceee84ac.webp',
    'lifestyle',
    'active',
    false,
    925,
    NOW() - INTERVAL '75 days'
  ),
  (
    'A decorative steampunk chair with intricate gears rotates slowly. The gears on the chair spin in place, with the larger central gear rotating faster than the rest. In the background, a wall covered with cascading gears moves at a synchronized, steady pace. The setting is a steampunk-inspired room with stone-pattern floor tiles in bronze and grey tones. The camera is positioned directly in front of the chair, focusing symmetrically on the mechanical movements for the duration of the video.',
    'https://static.vidfab.ai/user-video/vidfab-561e487f-4aef-46d3-9b14-cd10610117a3.mp4',
    'https://static.vidfab.ai/user-image/vidfab-561e487f-4aef-46d3-9b14-cd10610117a3.webp',
    'abstract',
    'active',
    false,
    924,
    NOW() - INTERVAL '76 days'
  ),
  (
    'On rainy days, raindrops drop on the umbrella, focusing on describing natural weather. The girl''s hand without an umbrella was held, she held her index finger tightly and made a move to silence her eyes.',
    'https://static.vidfab.ai/user-video/vidfab-51bff06a-e603-407a-ba80-957355494a7f.mp4',
    'https://static.vidfab.ai/user-image/vidfab-51bff06a-e603-407a-ba80-957355494a7f.webp',
    'portrait',
    'active',
    false,
    923,
    NOW() - INTERVAL '77 days'
  ),
  (
    'Fixed camera, golden light spots flickering, glowing ice cubes, beer bottle shining, ice cubes moving, 4K ultra-clear.',
    'https://static.vidfab.ai/user-video/vidfab-c986eae9-6828-49f9-8e7b-50328794f19d.mp4',
    'https://static.vidfab.ai/user-image/vidfab-c986eae9-6828-49f9-8e7b-50328794f19d.webp',
    'cinematic',
    'active',
    false,
    922,
    NOW() - INTERVAL '78 days'
  ),
  (
    'Animate the image with natural motion',
    'https://static.vidfab.ai/user-video/vidfab-4ebaf8a3-36df-4eb8-bb29-8a9a1e50c817.mp4',
    'https://static.vidfab.ai/user-image/vidfab-4ebaf8a3-36df-4eb8-bb29-8a9a1e50c817.webp',
    'abstract',
    'active',
    false,
    921,
    NOW() - INTERVAL '79 days'
  ),
  (
    'A close-up scene showcasing a cocktail glass filled with a vibrant yellow-orange drink, ice cubes, and garnished with a slice of cucumber and mint, set against a sunny outdoor backdrop with water and scattered fresh fruits. The view gracefully zooms out to reveal a woman in a bikini reaching out to grab the cocktail, then raising it to her lips to take a sip. She smiles joyfully as she enjoys the drink, conveying a sense of relaxation and enjoyment. The background remains vividly detailed with the sparkling water and colorful fruits adding to the summery vibe, filmed in 4K ultra-high-definition with dynamic yet smooth camera movements.',
    'https://static.vidfab.ai/user-video/vidfab-01f7e648-b1f4-4fef-bc8d-65eba91878fd.mp4',
    'https://static.vidfab.ai/user-image/vidfab-01f7e648-b1f4-4fef-bc8d-65eba91878fd.webp',
    'cinematic',
    'active',
    false,
    920,
    NOW() - INTERVAL '80 days'
  )
;

-- 验证插入结果
SELECT category, COUNT(*) as count
FROM discover_videos
GROUP BY category
ORDER BY count DESC;

-- 查看总数
SELECT COUNT(*) as total FROM discover_videos;

-- =====================================================
-- SQL 生成成功！
-- 数据条数: 81
-- 
-- 下一步:
-- 1. 复制上面的 SQL
-- 2. 在 Supabase Dashboard 的 SQL Editor 中执行
-- =====================================================
