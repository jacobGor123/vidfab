-- 用户配额管理函数
-- 修复 get_user_quota 401 错误

-- 创建获取用户配额信息的函数
CREATE OR REPLACE FUNCTION get_user_quota(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    user_record RECORD;
    video_stats RECORD;
    storage_stats RECORD;
    max_videos INTEGER;
    max_size_bytes BIGINT;
    plan_name VARCHAR(20);
BEGIN
    -- 获取用户基本信息
    SELECT
        uuid,
        subscription_plan,
        credits_remaining
    INTO user_record
    FROM users
    WHERE uuid = user_uuid;

    -- 如果用户不存在，返回默认配额
    IF user_record.uuid IS NULL THEN
        RETURN jsonb_build_object(
            'current_videos', 0,
            'max_videos', 50,
            'current_size_bytes', 0,
            'max_size_bytes', 104857600,
            'current_size_mb', 0,
            'max_size_mb', 100,
            'videos_percentage', 0,
            'storage_percentage', 0,
            'can_upload', true,
            'is_subscribed', false
        );
    END IF;

    plan_name := COALESCE(user_record.subscription_plan, 'free');

    -- 根据订阅计划设置限制
    CASE plan_name
        WHEN 'free' THEN
            max_videos := 50;
            max_size_bytes := 104857600; -- 100MB
        WHEN 'lite' THEN
            max_videos := 200;
            max_size_bytes := 1073741824; -- 1GB
        WHEN 'pro' THEN
            max_videos := 1000;
            max_size_bytes := 5368709120; -- 5GB
        WHEN 'premium' THEN
            max_videos := 5000;
            max_size_bytes := 21474836480; -- 20GB
        ELSE
            max_videos := 50;
            max_size_bytes := 104857600; -- 100MB
    END CASE;

    -- 获取用户视频统计（检查表是否存在）
    BEGIN
        SELECT
            COUNT(*) as video_count,
            COALESCE(SUM(file_size), 0) as total_size
        INTO video_stats
        FROM user_videos
        WHERE user_id = user_uuid::TEXT
        AND status != 'deleted';
    EXCEPTION WHEN OTHERS THEN
        -- 如果 user_videos 表不存在或其他错误，使用默认值
        video_stats.video_count := 0;
        video_stats.total_size := 0;
    END;

    -- 计算百分比
    DECLARE
        videos_percentage INTEGER;
        storage_percentage INTEGER;
        current_size_mb NUMERIC;
        max_size_mb NUMERIC;
    BEGIN
        videos_percentage := CASE
            WHEN max_videos > 0 THEN ROUND((video_stats.video_count::NUMERIC / max_videos) * 100)
            ELSE 0
        END;

        storage_percentage := CASE
            WHEN max_size_bytes > 0 THEN ROUND((video_stats.total_size::NUMERIC / max_size_bytes) * 100)
            ELSE 0
        END;

        current_size_mb := ROUND(video_stats.total_size::NUMERIC / 1048576, 2);
        max_size_mb := ROUND(max_size_bytes::NUMERIC / 1048576, 2);

        RETURN jsonb_build_object(
            'current_videos', video_stats.video_count,
            'max_videos', max_videos,
            'current_size_bytes', video_stats.total_size,
            'max_size_bytes', max_size_bytes,
            'current_size_mb', current_size_mb,
            'max_size_mb', max_size_mb,
            'videos_percentage', videos_percentage,
            'storage_percentage', storage_percentage,
            'can_upload', (video_stats.video_count < max_videos AND video_stats.total_size < max_size_bytes),
            'is_subscribed', (plan_name != 'free')
        );
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION get_user_quota(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_quota(UUID) TO anon;