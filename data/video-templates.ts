import { MediaQuality } from "@/types/video-optimization"
import type { VideoData } from "@/types/video-optimization"

// Raw video data parsed from user input
const rawVideoEntries = [
  {
    prompt: "animate the image",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-2910ad47-9d15-4ab4-8a59-aea9cf2500d8.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-2910ad47-9d15-4ab4-8a59-aea9cf2500d8.mp4"
  },
  {
    prompt: "一位金髮女子站在微暗水中，周圍漂浮著多朵紅玫瑰，她緩慢地將手深入水中，拾起一朵漂浮的紅玫瑰，水波隨著手的動作溫柔晃動。背景為柔和的光線，映照出鮮豔玫瑰的色彩。鏡頭從正面微下方角度拍攝，聚焦於動作和水波細節。",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-cc5fedd1-507a-4415-bef7-7bfe1d3e8c49.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-cc5fedd1-507a-4415-bef7-7bfe1d3e8c49.mp4"
  },
  {
    prompt: "A young boy with blond hair and a yellow scarf, wearing a blue robe, is holding a vividly colored rose in his hand. He naturally floats up and down in the air, his scarf gently waving as if blown by the wind. Rose petals detach from the rose and softly float around him. The environment features a mystical, space-like background with colorful ribbons of light gracefully floating around, and stars in the background gently twinkling. The camera is fixed in place, capturing the entire scene from a medium distance.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-18f88fc8-b716-4766-9d99-19cadea0a78c.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-18f88fc8-b716-4766-9d99-19cadea0a78c.mp4"
  },
  {
    prompt: "A glass-like textured bottle suspended mid-air begins to drop gently towards the water's surface. As it touches the water, ripples and a mild splash form, with sunlight reflecting off the surface. Background is minimal and clean, emphasizing the water's texture. The camera is fixed slightly above, capturing the falling motion and water interaction from an overhead angle.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-336a09f9-94e4-47c2-9131-8a00d1fdec6d.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-336a09f9-94e4-47c2-9131-8a00d1fdec6d.mp4"
  },
  {
    prompt: "A lively meadow scene with flowers and green leaves swaying visibly in the wind against a clear blue sky. An astronaut in a white space suit raises their arm, attempting to reach for a yellow butterfly, but hesitates and stops midway. The butterfly flutters gracefully, moving between flowers, as the camera follows its motion afterward. The shot remains steady with no zooming in or changing perspective.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-66b5448f-56aa-4617-971b-455131516817.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-66b5448f-56aa-4617-971b-455131516817.mp4"
  },
  {
    prompt: "The camera gently pans from left to right, capturing a warm, softly lit indoor setting with a minimalistic design. A textured white table with metallic legs and a vase of white flowers is initially in focus. The frame gradually reveals a plush leather chair to the side and a large abstract painting hanging on the wall. The room's color palette consists of soft beige tones, creating a calm and cozy ambiance.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-94280875-2418-4d8e-a7d4-11bf7412f7fd.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-94280875-2418-4d8e-a7d4-11bf7412f7fd.mp4"
  },
  {
    prompt: "The astronaut dozes off, simulating the human dozing motion. The scenery in the window accelerates from right to left, simulating the subway scenery.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-5cce9ba1-1931-4d9c-aa6e-6841ff129797.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-5cce9ba1-1931-4d9c-aa6e-6841ff129797.mp4"
  },
  {
    prompt: "Mermaid sheds tears, tears turn into pearls, she dives into the water, swimming underwater",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-d532167c-1ed9-4799-8cd4-fb48d1701745.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-d532167c-1ed9-4799-8cd4-fb48d1701745.mp4"
  },
  {
    prompt: "A person in a dark hoodie stands on rain-soaked deserted train tracks in a dystopian city. In the distance, a large hovering red glowing eye stares at them. Slowly, the eye blinks and completely closes. The person then suddenly runs forward with determination, splashing water under their feet. The environment is gloomy with barren buildings, light rain, and wet reflective surfaces. The camera is positioned low behind the individual, slightly zooming in during the motion.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-5648e60a-78ea-42d2-8442-360840e1cc7e.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-5648e60a-78ea-42d2-8442-360840e1cc7e.mp4"
  },
  {
    prompt: "Multiple daisy flowers surrounding jars and a glass vase gently sway back and forth, their petals moving with a soft breeze. The shifting light causes the shadows of the flowers, jars, and vase to move subtly on the marble surface. The scene is professionally composed on a bright marble table, with sunlight creating soft highlights and shadows. The camera remains stationary, capturing the scene from a slightly tilted overhead angle, perfectly showcasing the premium setup.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-94870e88-9d46-4f9c-8d17-bf9dd3473c27.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-94870e88-9d46-4f9c-8d17-bf9dd3473c27.mp4"
  },
  {
    prompt: "Butterflies flutter gracefully, and fireflies glow softly in the air. A child sits atop a giant golden fish, holding a fishing rod and playfully swaying it. The majestic fish leaps across the river's surface, carrying the child on its back. Gentle ripples spread with each jump, shimmering under the warm, magical light. The scene is filled with a dreamlike atmosphere, blending fantasy and wonder.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-f12daa09-d38c-41e9-9f0e-36758e5c0d0b.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-f12daa09-d38c-41e9-9f0e-36758e5c0d0b.mp4"
  },
  {
    prompt: "金吉拉猫低头，看着锅里的土豆丝，一手拿着锅铲一手扶着锅柄，拿着锅铲在锅里翻炒土豆丝，左右翻炒，拿着锅柄的手颠着锅，变化，过程顺滑，严格按照提示词执行",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-a6b26e8b-fcf6-4dab-9814-3fcfe5d93b45.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-a6b26e8b-fcf6-4dab-9814-3fcfe5d93b45.mp4"
  },
  {
    prompt: "Butterflies flying",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-5aff6321-3a8a-4cff-b8ed-f2f224f9570e.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-5aff6321-3a8a-4cff-b8ed-f2f224f9570e.mp4"
  },
  {
    prompt: "A young woman with long black hair wearing a white shirt sits indoors, her expression is playful and mischievous. She gently sticks out her tongue with a slight smile, showing a cute and teasing look. The camera remains fixed in a front-facing view, maintaining focus on the woman's face for a clear depiction of the tongue movement.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-f98e5d07-0ba0-44e4-ab9b-28cdb0b7fe24.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-f98e5d07-0ba0-44e4-ab9b-28cdb0b7fe24.mp4"
  },
  {
    prompt: "A woman wearing a futuristic, blue-green cyberpunk outfit walks into the frame from off-screen and sits down on a vibrant green, clear inflatable sofa, leaning back to showcase its softness and comfort. The scene takes place in a minimally lit industrial space with large windows allowing soft natural light to flow in. The camera is positioned at mid-range, slightly below eye level, capturing the interaction in a professional, dynamic ad style with smooth motion tracking. Ultra-clear quality with natural human dynamics.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-5cdaa640-2fe8-4070-a8ee-aa4aaed62242.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-5cdaa640-2fe8-4070-a8ee-aa4aaed62242.mp4"
  },
  {
    prompt: "Woman controlling flames, fire burning, forming a heart shape in the air, exploding,4K",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-2f94c6d7-b404-4ecc-afdd-e699748ca0c5.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-2f94c6d7-b404-4ecc-afdd-e699748ca0c5.mp4"
  },
  {
    prompt: "A girl with vibrant artistic makeup and a bouquet of flowers slowly opens her eyes and looks at the camera. The scene has a textured, abstract blue background with yellow-green lighting. The girl is softly illuminated with close-up detail, and the camera is fixed in a front-facing position.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-113ef8ff-a468-4d9c-8ef9-c72b7a1636da.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-113ef8ff-a468-4d9c-8ef9-c72b7a1636da.mp4"
  },
  {
    prompt: "The warrior is walking",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-2d66b8f5-b8a6-4d7c-ba3c-9e1047a9eb08.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-2d66b8f5-b8a6-4d7c-ba3c-9e1047a9eb08.mp4"
  },
  {
    prompt: "A gray-haired chair in a cozy room gradually transforms, with fur growing and its legs and frame reshaping into those of a werewolf. The werewolf stands in the middle of the warm-lit room, raising its head, opening its mouth, and letting out a deep growl. The background remains steady with a bookshelf, wooden flooring, and sunlight streaming in through the windows. The camera remains stationary, capturing the transformation from a medium-close angle.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-b5fba292-7376-4ee0-a287-8b8596b1ae01.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-b5fba292-7376-4ee0-a287-8b8596b1ae01.mp4"
  },
  {
    prompt: "Plants sway gently in the rhythmic motion of the wind. Flowers break away from the plants one by one, floating downward, with some landing on the scoop of ice cream while others drift out of view. The background is simple and blurred to draw attention to the interaction between the flowers and the ice cream. The camera is fixed on the ice cream with a static angle, simulating the natural dynamics of flowers falling on ice cream.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-6cdde798-4009-4604-8621-ea7ae85c9824.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-6cdde798-4009-4604-8621-ea7ae85c9824.mp4"
  },
  {
    prompt: "A satellite equipped with solar panels orbits the Earth in the vastness of space. The Earth slowly rotates towards the camera, revealing the Earth's curvature and atmospheric clouds. The satellite moves smoothly along its orbit, making tiny angular adjustments to track the Earth. The camera slowly rotates, capturing details of the satellite and the curvature of the Earth. In the background is a dark expanse of space, illuminated by distant stars and the sunlight that bathes the Earth.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-f381ec51-3c26-48f9-82a6-b68e20d6e15e.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-f381ec51-3c26-48f9-82a6-b68e20d6e15e.mp4"
  },
  {
    prompt: "A lit candle inside a detailed ceramic holder with floral patterns. The candle flame flickers gently while smoke rises smoothly in a natural motion. The environment is warm and atmospheric, with soft lighting. Decorative flowers and greenery are scattered around, adding a natural and tranquil tone. The camera is close-up and slightly elevated, focusing on the candle holder with a soft blur in the background for a professional advertisement effect.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-cb012594-5f36-4e24-8914-4d552ead1ef2.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-cb012594-5f36-4e24-8914-4d552ead1ef2.mp4"
  },
  {
    prompt: "A cat starts in a resting position on the top platform of a multi-level cat tree, then rises gracefully and jumps down to the ground in one agile and natural motion. The camera angle captures the action professionally to emphasize the stability of the cat tree while showcasing the dynamic and natural movement of the cat. The background is a softly lit indoor space with a beige wall, a curtain on the left, and a wooden cabinet on the right. The scene is shot in 4K resolution, with smooth motion that adheres to realistic feline behavior patterns.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-daaacef1-2344-45e5-968c-1e460ccf42f0.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-daaacef1-2344-45e5-968c-1e460ccf42f0.mp4"
  },
  {
    prompt: "A warm and bright laundry room, with sunlight streaming through the window and green plants along with wooden decor creating a cozy environment. A washing machine is silently positioned within. 1-2 seconds: A close-up shot shows the washing machine quietly in place, sunlight enhancing the calming household atmosphere. 2-4 seconds: A medium shot captures the user placing clothes into the machine, adding detergent, closing the door, adjusting the knob, and pressing start—efficient and natural. 4-6 seconds: A close-up reveals the washing machine drum spinning smoothly, with clothes gently tumbling in the water, maintaining a quiet and steady operation. 6-8 seconds: A side or overhead shot showcases the laundry room, with stationary objects such as table cups and plants, emphasizing the machine's vibration-free performance. 8-10 seconds: A medium shot shows the user opening the washing machine door, smiling, and taking out clean, soft clothes, folding them neatly in the serene and cozy environment.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-f03fedb4-b15a-46c0-9210-bd9e65ade873.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-f03fedb4-b15a-46c0-9210-bd9e65ade873.mp4"
  },
  {
    prompt: "Hyperrealistic: Photorealistic:The fairy sits gracefully on a snow-covered branch, surrounded by shimmering icy icicles. She slowly rises, her movements fluid and elegant. Her delicate wings unfold, glowing softly with an icy light. With a gentle flutter, she leaps from the branch, and a swirl of sparkling snowflakes and magical glimmers bursts around her.In mid-flight, her wings leave behind a glowing trail, resembling frosty patterns in the air. Her dress and flowing hair ripple gently with the motion. The camera follows her ascent, capturing the enchanting flight as she hovers in mid-air, surrounded by whirling snowflakes, creating a magical and dreamlike atmosphere.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-74c7f150-0072-4396-97cf-dc80f1a75513.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-74c7f150-0072-4396-97cf-dc80f1a75513.mp4"
  },
  {
    prompt: "A stylish boy wearing ski gear reaches into the frame from below with one hand, picks up the ski goggles, and smoothly places them on his head. He then grabs a snowboard and makes a 'V' hand gesture while smiling. Snowflakes gently fall in the bright snowy environment, with concrete structures in the background. The camera starts at a lower angle, focusing on the hand entering, then dynamically follows to capture the full sequence in a professional advertisement style with smooth transitions.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-bc7e2fe1-97ed-4584-8561-5bb8b6180132.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-bc7e2fe1-97ed-4584-8561-5bb8b6180132.mp4"
  },
  {
    prompt: "The ball in front of the cat floats up and down, the cat yawns gracefully, the cat's hair floats slightly, the perspective remains unchanged, beautiful and gentle",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-fb4a22f6-0253-43ac-a675-d427264d2fe2.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-fb4a22f6-0253-43ac-a675-d427264d2fe2.mp4"
  },
  {
    prompt: "大雪中，俄罗斯美女抚摸着白狮子的鬃毛，狮子伸出舌头舔了一下俄罗斯美女的脸，4k，高清，精致",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-30bcb9f4-1b7b-4541-bd52-ed7d1831bf2c.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-30bcb9f4-1b7b-4541-bd52-ed7d1831bf2c.mp4"
  },
  {
    prompt: "Flat oil painting texture, simulating the dynamic movement of goldfish swimming around",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-86566b34-8ac0-46e7-9dec-131bc9669c08.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-86566b34-8ac0-46e7-9dec-131bc9669c08.mp4"
  },
  {
    prompt: "In an outdoor setting, flowers in the foreground sway gently in the wind while a person behind them gradually lifts their hand towards the sky. The camera remains static, capturing the scene from a steady front-facing angle.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-512ef404-640f-4384-afb6-6451a9e55fb7.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-512ef404-640f-4384-afb6-6451a9e55fb7.mp4"
  },
  {
    prompt: "A silver and black analog camera sits on a reflective surface in a bright modern office. A man picks up the camera with his hands and turns it to inspect it, showing the fine details of the camera's construction. The whole scene then switches to a close-up of a hand holding a printed photo. Focusing the photo, the picture zooms in to an attractive young woman sitting at a desk, working in a professional modern office, with the background softly blurred. High-quality professional advertising-grade 4K video with smooth transitions and sharp focus.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-29213994-a459-448d-9f70-1207c95b570a.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-29213994-a459-448d-9f70-1207c95b570a.mp4"
  },
  {
    prompt: "A boy in a white shirt stands in front of a lamp post, holding a bouquet of roses. He smiled and slowly extends one rose from the bouquet toward the camera. The camera remains fixed in front of the boy, focusing on the gesture and capturing details of the transition.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-f54a8f17-ed3e-4764-985a-85081da4dbfa.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-f54a8f17-ed3e-4764-985a-85081da4dbfa.mp4"
  },
  {
    prompt: "A black cartoon-style cat with large expressive green eyes peers around a turquoise wall, staring directly at the camera. As the video progresses, its tail slowly appears from beneath the wall, swaying gently. The environment is drawn in a flat picture-book style with soft pastel green and turquoise tones. The camera remains static in a frontal view.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-e8c70c49-f6cb-462f-9cf2-c8271dfbf325.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-e8c70c49-f6cb-462f-9cf2-c8271dfbf325.mp4"
  },
  {
    prompt: "Cat waves wand,Harry Potter style, magical effects, 4K, ultra HD, detailed, highly refined",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-4cc22572-404e-4f8c-a639-a41ad751c234.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-4cc22572-404e-4f8c-a639-a41ad751c234.mp4"
  },
  {
    prompt: "A black cat with wide eyes sits at a desk in an office engulfed in flames in the background. The cat first holds a coffee cup in one paw, taking a slow sip before placing it back on the table. Next, the cat positions its paws on the keyboard and types slowly, occasionally glancing at the computer monitor. The office background remains lit with warm colors from the fire. The camera captures a medium close-up angle, showing the cat's calm demeanor amidst the dramatic setting.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-3d070281-0c2d-4801-b970-d23117c4ddcd.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-3d070281-0c2d-4801-b970-d23117c4ddcd.mp4"
  },
  {
    prompt: "A futuristic gaming mouse hovers up and down slowly in mid-air above a glowing circular platform with neon lights. The scene is inside a sci-fi station with a backdrop of space, including a starry sky and floating asteroids. The camera is positioned in an angled close-up view, tracking the mouse's motion with steadiness.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-68682289-6924-43fd-9306-ad33bfe92b05.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-68682289-6924-43fd-9306-ad33bfe92b05.mp4"
  },
  {
    prompt: "大家微笑，互相拥抱",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-b2c098c3-8cf8-4380-9642-d9bed8c0e523.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-b2c098c3-8cf8-4380-9642-d9bed8c0e523.mp4"
  },
  {
    prompt: "In a futuristic city with a misty atmosphere and towering spire-like buildings in the background, multiple futuristic cars fly forward in the same direction at a synchronized speed, maintaining consistent distances and ensuring no collisions. The vehicles are illuminated by neon purple and blue lights, and the large central tree is visible in the scene. The camera remains static to capture the uniform motion of the vehicles in a symmetrical composition.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-600932d5-1915-4f00-96ee-2402f3348be6.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-600932d5-1915-4f00-96ee-2402f3348be6.mp4"
  },
  {
    prompt: "An orange tabby cat is clutching a dinosaur egg tightly while sprinting toward the camera with a panicked expression. Behind it, a ferocious T-Rex roars angrily at the fleeing cat.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-33f75def-89db-4ce9-b37a-6f70706c198a.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-33f75def-89db-4ce9-b37a-6f70706c198a.mp4"
  },
  {
    prompt: "A white fluffy dog wearing a leather biker outfit and goggles is riding a motorcycle. The motorcycle's wheels rotate counterclockwise. The background expands, revealing more of an urban cityscape with tall buildings and a bright, dramatic sunset. The camera starts with the dog slightly off-center and slowly zooms out and repositions to bring the dog and motorcycle to the center of the frame.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-19029012-2eb6-4ea5-be43-089c6adee8b1.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-19029012-2eb6-4ea5-be43-089c6adee8b1.mp4"
  },
  {
    prompt: "The camera rotates horizontally to the right, smoothly capturing the serene dreamlike cityscape with its pastel architecture, domed structures, and glowing light fixtures. The water surface displays gentle ripples that interact with the soft illumination, creating a shimmering effect. Clouds drift naturally across the sky from left to right, enhancing the picturesque quality. As the camera pans, new structures consistent with the original style emerge on the right, extending the fantastical ambiance with glowing elements and intricate architecture.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-fa03d336-6d90-48f8-b400-a5cc15857eb5.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-fa03d336-6d90-48f8-b400-a5cc15857eb5.mp4"
  },
  {
    prompt: "Three scuba divers are swimming underwater near a large, calm shark. One diver reacts with surprise, flailing momentarily, while the other two notice and swim closer. The divers gather together and gesture to communicate, then swim slowly away from the shark. The underwater environment is serene, with sunlight streaming through the water's surface, casting a soft blue glow. The camera is positioned below and angled upward, highlighting the scale of the shark and the dramatic lighting from above.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-5aabf497-c66b-4157-8713-73e873609152.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-5aabf497-c66b-4157-8713-73e873609152.mp4"
  },
  {
    prompt: "A European or American woman wearing professional attire walks into the scene carrying a briefcase, then slumps and reclines onto the watermelon-shaped sofa, highlighting its softness and comfort. The scene depicts a modern, stylish living room with vibrant curtains, abstract lighting, and pastel tones in the background. The camera remains steady with a fixed angle, maintaining a professional commercial perspective that emphasizes the sofa's detail and the natural movement of the woman. Super high-definition video with smooth and realistic body dynamics.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-d1e996a7-fc3c-4d6e-b270-7490aead14e7.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-d1e996a7-fc3c-4d6e-b270-7490aead14e7.mp4"
  },
  {
    prompt: "A large, detailed spaceship moves forward through a glowing, circular time-space gate surrounded by metallic infrastructure. The glowing portal illuminates the futuristic scene, with Earth visible in the background and soft clouds floating below. The camera is positioned in front of the spaceship, slightly below the center, capturing its gradual movement forward in high detail as the portal's bright light reflects off the ship's metallic surface.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-9179f814-1763-4740-bed6-bb009adcba2c.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-9179f814-1763-4740-bed6-bb009adcba2c.mp4"
  },
  {
    prompt: "A butterfly flies erratically in various directions, flapping its wings quickly and changing orientation. Meanwhile, an astronaut takes slow, careful steps toward a mountain, slightly tilting their body as if inspecting something. The background shows a vast rocky terrain with a mountain in the distance under a clear blue sky. The camera starts with a medium shot capturing both the butterfly and astronaut, then slowly tracks the astronaut as they move closer to the mountain.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-350ff83c-44ff-4db1-8365-12d6e1e0d157.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-350ff83c-44ff-4db1-8365-12d6e1e0d157.mp4"
  },
  {
    prompt: "Hyper speed pov shot zooms across a chaotic battlefield, dodging explosions, shrapnel and gunfire as this soldier sprints in front of the camera, weaving through smoke, rubble and explosions, the environment blurring in rapid motion as chaos erupts all around him",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-2713d1aa-cf79-486b-bf4f-0a9914f10ed3.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-2713d1aa-cf79-486b-bf4f-0a9914f10ed3.mp4"
  },
  {
    prompt: "A pair of hands plays a black piano decorated with delicate gold ornaments. The right hand in the frame presses the piano keys smoothly, and the other left hand joins in as the right hand switches to play the piano on the right side, maintaining natural movement. The background is a warm traditional interior with Chinese calligraphy scrolls and decorations. The gold particles float naturally in the air and move gently, adding to the artistic atmosphere. The camera is slightly above and to the side of the piano, capturing the hand movements and instrument in 4K ultra-clear quality with a fixed angle of view.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-ef35eeeb-dee4-4810-a9ad-728955998481.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-ef35eeeb-dee4-4810-a9ad-728955998481.mp4"
  },
  {
    prompt: "A transparent chair stands stationary on a calm water surface with delicate ripples. The background is illuminated by soft, natural light under a clear sky. The camera slowly zooms in, keeping the chair centered as water ripples gently move across the surface.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-8d27ef24-39e2-4c1f-9f85-3c05b7cd0bc2.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-8d27ef24-39e2-4c1f-9f85-3c05b7cd0bc2.mp4"
  },
  {
    prompt: "Anime girl reaches out from the screen, holding hands with the hand outside the screen.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-2eac1d61-e20e-4116-9bc5-1f36bf6fb9c9.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-2eac1d61-e20e-4116-9bc5-1f36bf6fb9c9.mp4"
  },
  {
    prompt: "Animate the image",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-c05e67c2-336c-4428-aad3-ccff5444496a.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-c05e67c2-336c-4428-aad3-ccff5444496a.mp4"
  },
  {
    prompt: "The motorcycle accelerates and performs circular drifts in a wet urban environment at dusk, splashing water and creating a vivid effect of movement. The neon lights of the surrounding futuristic buildings illuminate the scene, showing reflective details on the wet ground. The camera transitions a dynamic tracking shot following the acrobatic curves of the motorcycle, emphasizing the speed and complex mechanical craftsmanship of the motorcycle. Slow motion and cinematic highlights mimic the effect of a high-energy motorcycle commercial. The action matches the natural movement of the human body, and the motorcycle matches the laws of natural movement.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-2dcebef5-ec13-4e11-a979-25ff92fbef05.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-2dcebef5-ec13-4e11-a979-25ff92fbef05.mp4"
  },
  {
    prompt: "Masterful cinematography, a beautiful woman, first sways hips to the right, then to the left, then jumps into a trending dance, cute expression, vertical tilt camera movement, realistic human motion, lifelike visuals, smooth animation, vivid details, soft and consistent lighting.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-93bed41a-4745-4b77-bca4-4371117237b1.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-93bed41a-4745-4b77-bca4-4371117237b1.mp4"
  },
  {
    prompt: "An animated fluffy white dog with a red collar joyfully descends from the sky onto a large fluffy cloud. The dog lands gracefully, sending small puffs of cloud upward. After landing, it turns its head toward the camera with a cheerful expression and wags its tail. Then, the dog leaps forward toward a higher cloud, showing playful energy. The background is a dreamy blue sky with fluffy white clouds illuminated by soft, warm light. The camera follows the dog's movements, starting wide, zooming in slightly to capture its expressions, then zooming out to follow its leap.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-02978690-262f-4b30-b406-b1d05e882c63.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-02978690-262f-4b30-b406-b1d05e882c63.mp4"
  },
  {
    prompt: "A Siberian Husky facing the camera, with the camera smoothly panning around in a full circle.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-d418b4be-e8cc-4c35-845e-16d7f1f40b45.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-d418b4be-e8cc-4c35-845e-16d7f1f40b45.mp4"
  },
  {
    prompt: "move",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-ff87e475-44b0-48c1-a0b2-54e218cba858.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-ff87e475-44b0-48c1-a0b2-54e218cba858.mp4"
  },
  {
    prompt: "An astronaut in a full space suit is seated at a grand white piano on the moon's surface. The astronaut's hands dynamically move over the piano keys, simulating realistic human-like playing. The Earth, visible in the background, rotates gradually to the right under a starry sky. The camera remains fixed at a slightly angled side view, capturing the astronaut, piano, and the Earth rotation in one consistent static frame. Ensure smooth motion transitions over 10 seconds.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-83d7d447-3a33-4bd1-8471-ab6d5a5179e5.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-83d7d447-3a33-4bd1-8471-ab6d5a5179e5.mp4"
  },
  {
    prompt: "A car is moving forward on the road, leaving the roadside scenery behind",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-5d574636-ba8b-4a2e-b25a-e0ffa3226fc3.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-5d574636-ba8b-4a2e-b25a-e0ffa3226fc3.mp4"
  },
  {
    prompt: "A male model walks confidently on a fashion catwalk, his steps firm and slightly swaying, exuding charm. His deep eyes look teasingly forward, accompanied by a subtle smile, as he occasionally touches his collar or lifts the hem of his clothes gracefully. The camera follows him from a low angle, capturing his elegant and powerful movements on a glowing golden runway backdrop with abstract lighting.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-dc54fefd-344f-4b8d-9d07-bd66ab1202f0.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-dc54fefd-344f-4b8d-9d07-bd66ab1202f0.mp4"
  },
  {
    prompt: "A natural outdoor scene featuring a serene lake or ocean at sunset. The camera slowly moves forward, showing trees on both sides with leaves swaying noticeably in the wind. An orange circular sun gradually sinks into the water, while the waves crash forward energetically. The lighting creates warm, orange reflections on the water's surface.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-a39bd67e-8d57-4701-bc0c-335435dd5efa.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-a39bd67e-8d57-4701-bc0c-335435dd5efa.mp4"
  },
  {
    prompt: "石像上的星球转动，石像缓慢闭上石像的眼睛，下方的小人后退几步，水因为小人后退产生水波纹，水波纹细节。摄像头平视慢慢渐渐聚焦到小人",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-fe4d8875-7ab6-4b91-96b3-547b2f3eae6d.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-fe4d8875-7ab6-4b91-96b3-547b2f3eae6d.mp4"
  },
  {
    prompt: "A large reptilian monster with spiked back slowly looks left, then right, turning its massive head. Suddenly, it quickly turns toward the camera, opening its large mouth wide and roaring fiercely, revealing sharp teeth. The camera simulates a human perspective, trembling subtly at first but violently shaking as the monster roars. The camera then drops to the ground, facing upward. The environment is a destroyed urban setting with tall, crumbling buildings, debris scattered around, and a faint blue glow adding an ominous atmosphere.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-26cc80d9-9ba8-47c0-abb5-6732ecdd344b.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-26cc80d9-9ba8-47c0-abb5-6732ecdd344b.mp4"
  },
  {
    prompt: "A pink quilted handbag with a golden clasp and pearl handle dangles gently in the center, showcasing intricate details in a stable manner. In the background, pearls and diamonds fall gradually and naturally onto a glittery ground. The scene is set against a bright blue sky with soft clouds, colorful ribbons, and sparkling accents. The camera remains fixed and stable.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-68bed557-a35f-48e3-b24c-4df144bb4f5f.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-68bed557-a35f-48e3-b24c-4df144bb4f5f.mp4"
  },
  {
    prompt: "Raccoon looking around, head tilting, paw movements, head lift, happy smile, warm sunlight, soft lighting, high-resolution, realistic style, steady camera, smooth motion, cinematic 4K ultra-clear quality.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-83902e34-9546-4095-a5fa-9ab8f1ebf00b.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-83902e34-9546-4095-a5fa-9ab8f1ebf00b.mp4"
  },
  {
    prompt: "Panda holding bamboo, eating bamboo",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-0766276e-67ea-4593-b201-bff0b7f0d471.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-0766276e-67ea-4593-b201-bff0b7f0d471.mp4"
  },
  {
    prompt: "A giant gray tabby cat walks forward slowly through a destroyed urban city street, looking directly ahead with a firm gaze. Its tail sways slightly as it moves. The background reveals a dystopian city with destroyed buildings, scattered rubble, and cars either parked or moving on the sides of the road. The atmosphere is gloomy with dark, overcast clouds, and birds circle the ruins in the distance. The camera is positioned at ground level in the center of the street with a slight upward tilt, capturing the cat's towering presence as it advances.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-1d960458-3e30-4fc8-a0fa-5bbe3afe220a.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-1d960458-3e30-4fc8-a0fa-5bbe3afe220a.mp4"
  },
  {
    prompt: "A silver-haired woman in ornate armor stands beside a white dragon in a snowy mountain landscape. The woman gently turns her head to the side, gazing at the dragon, and slowly raises her hand to rest it on her sword or the dragon's snout. The dragon lowers its head, blinking slowly, and exhales a soft icy mist. Snowflakes fall gently in the background, with soft daylight illuminating the scene. The camera remains focused on a medium close-up of the woman and the dragon, slightly shifting angles to show their interaction.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-5212ab21-6673-449e-ac46-0a74e395adc8.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-5212ab21-6673-449e-ac46-0a74e395adc8.mp4"
  },
  {
    prompt: "A block-style character with a green and yellow pixelated hat, blue eyes, and a pipe decorated with flowers in their mouth. The character slowly turns their head to the left, then to the right, while exhaling small puffs of smoke from the pipe. The background features a swirly, starry pattern with a Van Gogh-inspired aesthetic, predominantly blue with yellow accents. The camera remains static, capturing the character from the chest upward in high detail.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-1a3bef62-8fe4-4545-be5d-88345a2f8c52.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-1a3bef62-8fe4-4545-be5d-88345a2f8c52.mp4"
  },
  {
    prompt: "A blue and white Ford Mustang car gradually transforms from a particle state into a real car, speeding on the road",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-aebb6641-a9ab-4edc-8614-4fefdb440136.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-aebb6641-a9ab-4edc-8614-4fefdb440136.mp4"
  },
  {
    prompt: "A woman with traditional Asian-style attire and accessories is depicted in a serene twilight blue environment. Her expression remains calm as she blinks slowly, her head gently tilts to the right, and her long hair sways lightly in the breeze. The background features faint architectural elements, softly illuminated. The camera remains stationary, positioned directly in front of the subject, focusing on her upper body and facial expression with a slight close-up.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-bb817471-f8d2-4835-b9ac-5b6e492f7f5a.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-bb817471-f8d2-4835-b9ac-5b6e492f7f5a.mp4"
  },
  {
    prompt: "A futuristic sports car is positioned in the center of a cyberpunk city street. The rear lights flicker twice before the car begins driving forward slowly and smoothly. The wet street reflects neon orange and teal lighting, while futuristic buildings and signage add depth to the background. The camera remains stationary behind the car, slightly angled downward to emphasize the road's texture and reflections.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-1839ad35-5cf3-4322-9d76-1b17c30b567a.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-1839ad35-5cf3-4322-9d76-1b17c30b567a.mp4"
  },
  {
    prompt: "background petals floating,water flowing, perfume bottle sparkling, 4K ultra-clear,Fixed camera",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-6b8ed914-fd36-4597-a316-9cea733de33d.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-6b8ed914-fd36-4597-a316-9cea733de33d.mp4"
  },
  {
    prompt: "A man wearing a Hawaiian shirt stands at a beach grilling station. He picks up a frothy beer mug from the grill with one hand, holding it up dramatically before taking a satisfying sip. The background shows a sunny beach with gentle waves and golden sand. Sizzling skewers of meat cook on the grill, while additional beer bottles sit nearby. The camera captures the scene from a slightly low angle with a professional beer advertisement perspective, focusing sharply on the man and the beer while softly blurring the beach and ocean in the distance.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-6435c766-2727-479e-9e19-ef292d262493.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-6435c766-2727-479e-9e19-ef292d262493.mp4"
  },
  {
    prompt: "A young woman with styled blonde hair adorned with a floral headpiece and wearing a vintage polka-dot outfit starts with her head tilted slightly, then raises her right hand to wave gently while smiling sweetly. The camera is positioned at eye level, capturing a medium-close shot of her upper torso and face.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-f71f2c85-51c5-4e3e-9f24-1bc1580a38cc.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-f71f2c85-51c5-4e3e-9f24-1bc1580a38cc.mp4"
  },
  {
    prompt: "On a cyberpunk street, a racer riding a motorcycle, speeding forward",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-38f3be38-fd52-4766-8f1b-cb807d2dbf98.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-38f3be38-fd52-4766-8f1b-cb807d2dbf98.mp4"
  },
  {
    prompt: "A man in a black feather-decorated coat stands in a forest of dead trees, looking firmly into the distance. The feathers on his coat sway gently in the wind. Several crows fly in the background, gradually moving away and disappearing out of the frame. The background is a gray sky and dead trees, adding to the gloomy atmosphere. The camera starts from a medium shot and gradually zooms in to the man's face, ending with a close-up that highlights his facial details as well as the somber mood.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-ba6d346c-5c3d-435f-9a6c-fa153ddf5272.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-ba6d346c-5c3d-435f-9a6c-fa153ddf5272.mp4"
  },
  {
    prompt: "A panda stands in the kitchen, holding a seasoning bottle next to the frying steak. It sprinkles seasoning on the steak in a slow and deliberate manner.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-d9a14c88-453e-4062-8f3c-69b6ceee84ac.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-d9a14c88-453e-4062-8f3c-69b6ceee84ac.mp4"
  },
  {
    prompt: "A decorative steampunk chair with intricate gears rotates slowly. The gears on the chair spin in place, with the larger central gear rotating faster than the rest. In the background, a wall covered with cascading gears moves at a synchronized, steady pace. The setting is a steampunk-inspired room with stone-pattern floor tiles in bronze and grey tones. The camera is positioned directly in front of the chair, focusing symmetrically on the mechanical movements for the duration of the video.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-561e487f-4aef-46d3-9b14-cd10610117a3.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-561e487f-4aef-46d3-9b14-cd10610117a3.mp4"
  },
  {
    prompt: "On rainy days, raindrops drop on the umbrella, focusing on describing natural weather. The girl's hand without an umbrella was held, she held her index finger tightly and made a move to silence her eyes.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-51bff06a-e603-407a-ba80-957355494a7f.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-51bff06a-e603-407a-ba80-957355494a7f.mp4"
  },
  {
    prompt: "Fixed camera, golden light spots flickering, glowing ice cubes, beer bottle shining, ice cubes moving, 4K ultra-clear.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-c986eae9-6828-49f9-8e7b-50328794f19d.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-c986eae9-6828-49f9-8e7b-50328794f19d.mp4"
  },
  {
    prompt: "无",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-4ebaf8a3-36df-4eb8-bb29-8a9a1e50c817.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-4ebaf8a3-36df-4eb8-bb29-8a9a1e50c817.mp4"
  },
  {
    prompt: "A close-up scene showcasing a cocktail glass filled with a vibrant yellow-orange drink, ice cubes, and garnished with a slice of cucumber and mint, set against a sunny outdoor backdrop with water and scattered fresh fruits. The view gracefully zooms out to reveal a woman in a bikini reaching out to grab the cocktail, then raising it to her lips to take a sip. She smiles joyfully as she enjoys the drink, conveying a sense of relaxation and enjoyment. The background remains vividly detailed with the sparkling water and colorful fruits adding to the summery vibe, filmed in 4K ultra-high-definition with dynamic yet smooth camera movements.",
    imageUrl: "https://static.vidfab.ai/user-image/vidfab-01f7e648-b1f4-4fef-bc8d-65eba91878fd.png",
    videoUrl: "https://static.vidfab.ai/user-video/vidfab-01f7e648-b1f4-4fef-bc8d-65eba91878fd.mp4"
  }
]

// Random usernames generated by the system
const randomUsernames = [
  "PixelDreamer", "NeonVisions", "CyberWave", "MysticFlow", "vidu_X23", "AI_Creator_99",
  "Sarah_Mitchell", "Alex_Chen", "ShadowHunter_X", "ZenGamer", "StormRider_Pro", "ArtisticSoul",
  "TechWizard_42", "DreamWeaver", "QuantumLeap", "CreativeMinds", "DigitalNomad", "VisionaryArt",
  "InnovateTech", "FutureVisions", "ArtGenius", "CyberPunk_88", "MindBender", "PixelMaster",
  "QuantumArt", "TechSavvy", "CreativeFlow", "DigitalDreams", "VisionCraft", "ArtTech_101",
  "FutureCreator", "PixelWiz", "CyberArtist", "TechVision", "CreativeEdge", "DigitalMuse",
  "VisionaryTech", "ArtInnovator", "PixelGenius", "CyberCreative", "TechDreamer", "DigitalVision",
  "CreativeTech", "PixelCraft", "CyberDream", "TechMuse", "DigitalGenius", "VisionTech",
  "ArtWizard", "PixelVision", "CyberMaster", "TechCreative", "DigitalCraft", "VisionGenius",
  "ArtTech", "PixelDream", "CyberVision", "TechWiz", "DigitalMaster", "VisionCraft_Pro",
  "ArtVision", "PixelTech", "CyberCraft", "TechDream", "DigitalWiz", "VisionMaster",
  "ArtCraft", "PixelGenius_X", "CyberWiz", "TechCraft", "DigitalDream_99", "VisionWiz",
  "ArtMaster", "PixelCraft_Pro", "CyberGenius"
]

// Content categorization keywords
const categoryKeywords = {
  portrait: ['woman', 'girl', 'boy', 'man', 'person', 'face', 'eyes', 'hair', 'smile', '女子', '美女', '男子'],
  nature: ['butterfly', 'flowers', 'tree', 'water', 'ocean', 'mountain', 'sky', 'sunlight', 'butterfly', 'panda', 'cat', 'dog', '猫', '狮子'],
  fantasy: ['fairy', 'mermaid', 'dragon', 'magic', 'mystical', 'werewolf', 'space', 'astronaut', 'floating', 'glowing'],
  lifestyle: ['kitchen', 'home', 'office', 'laundry', 'cooking', 'coffee', 'beer', 'sofa', '锅', '土豆丝'],
  abstract: ['animate', 'move', 'particles', 'transform', 'gears', 'abstract', 'minimal', 'texture'],
  cinematic: ['camera', 'zoom', 'tracking', 'cinematic', 'film', 'professional', 'lighting', 'composition'],
  vehicles: ['car', 'motorcycle', 'spaceship', 'satellite', 'bicycle', 'train'],
  technology: ['cyberpunk', 'futuristic', 'sci-fi', 'robot', 'AI', 'digital', 'gaming', 'tech']
}

// Intelligent categorization function
function categorizePrompt(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase()
  const scores: { [key: string]: number } = {}

  // Calculate scores for each category
  Object.entries(categoryKeywords).forEach(([category, keywords]) => {
    scores[category] = keywords.filter(keyword => lowerPrompt.includes(keyword.toLowerCase())).length
  })

  // Find the category with the highest score
  const bestCategory = Object.entries(scores).reduce((a, b) =>
    scores[a[0]] > scores[b[0]] ? a : b
  )[0]

  // Return the best category or 'abstract' as default
  return scores[bestCategory] > 0 ? bestCategory : 'abstract'
}

// Convert raw data to VideoData format
export const videoTemplatesData: VideoData[] = rawVideoEntries.map((entry, index) => {
  const category = categorizePrompt(entry.prompt)
  const randomUsername = randomUsernames[index % randomUsernames.length]
  const videoId = `vidfab-${entry.imageUrl.split('/').pop()?.split('.')[0] || index}`

  return {
    id: videoId,
    title: entry.prompt.slice(0, 50) + (entry.prompt.length > 50 ? '...' : ''),
    description: entry.prompt,
    prompt: entry.prompt, // Store original prompt for Remix functionality
    duration: Math.floor(Math.random() * 8) + 7, // 7-15 seconds
    aspectRatio: Math.random() > 0.7 ? '9:16' : '16:9',
    category: category,
    user: {
      id: randomUsername.toLowerCase().replace(/[^a-z0-9]/g, ''),
      name: randomUsername,
      avatar: "/placeholder-user.jpg"
    },
    createdAt: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)), // Random date within last 30 days
    urls: {
      thumbnail: {
        webp: entry.imageUrl.replace('.png', '.webp'),
        jpg: entry.imageUrl,
        placeholder: entry.imageUrl
      },
      video: {
        low: entry.videoUrl.replace('.mp4', '_480p.mp4'),
        medium: entry.videoUrl.replace('.mp4', '_720p.mp4'),
        high: entry.videoUrl,
        preview: entry.videoUrl
      },
      poster: entry.imageUrl
    },
    metadata: {
      fileSize: {
        low: Math.floor(Math.random() * 5 + 2) * 1024 * 1024,
        medium: Math.floor(Math.random() * 10 + 8) * 1024 * 1024,
        high: Math.floor(Math.random() * 20 + 15) * 1024 * 1024
      },
      resolution: {
        width: Math.random() > 0.7 ? 720 : 1280,
        height: Math.random() > 0.7 ? 1280 : 720
      },
      bitrate: Math.floor(Math.random() * 3000 + 2000),
      codec: 'h264'
    },
    loadState: 'idle',
    quality: MediaQuality.AUTO,
    preloadStrategy: 'metadata'
  }
})

// Category definitions with counts based on actual data
export const discoverCategories = [
  {
    name: "All",
    key: "all",
    count: videoTemplatesData.length
  },
  {
    name: "Portrait",
    key: "portrait",
    count: videoTemplatesData.filter(v => v.category === 'portrait').length
  },
  {
    name: "Nature",
    key: "nature",
    count: videoTemplatesData.filter(v => v.category === 'nature').length
  },
  {
    name: "Fantasy",
    key: "fantasy",
    count: videoTemplatesData.filter(v => v.category === 'fantasy').length
  },
  {
    name: "Lifestyle",
    key: "lifestyle",
    count: videoTemplatesData.filter(v => v.category === 'lifestyle').length
  },
  {
    name: "Abstract",
    key: "abstract",
    count: videoTemplatesData.filter(v => v.category === 'abstract').length
  },
  {
    name: "Cinematic",
    key: "cinematic",
    count: videoTemplatesData.filter(v => v.category === 'cinematic').length
  },
  {
    name: "Technology",
    key: "technology",
    count: videoTemplatesData.filter(v => v.category === 'technology').length
  }
]