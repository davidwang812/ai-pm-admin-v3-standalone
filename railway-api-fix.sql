-- 修复Railway数据库的统一配置表
-- 这个脚本应该在Railway数据库上执行

-- 1. 添加唯一约束，确保只有一条活动配置
ALTER TABLE unified_configs ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. 创建唯一索引，确保只有一条活动记录
CREATE UNIQUE INDEX IF NOT EXISTS idx_unified_configs_active 
ON unified_configs(is_active) 
WHERE is_active = true;

-- 3. 更新现有记录，只保留最新的为活动
UPDATE unified_configs SET is_active = false;
UPDATE unified_configs SET is_active = true 
WHERE id = (SELECT id FROM unified_configs ORDER BY updated_at DESC LIMIT 1);

-- 4. 修复保存逻辑的存储过程（可选）
CREATE OR REPLACE FUNCTION save_unified_config(config_json JSONB)
RETURNS JSONB AS $$
BEGIN
    -- 先将所有记录设为非活动
    UPDATE unified_configs SET is_active = false WHERE is_active = true;
    
    -- 插入新配置
    INSERT INTO unified_configs (config_data, is_active, created_at, updated_at)
    VALUES (config_json, true, NOW(), NOW());
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Configuration saved successfully'
    );
END;
$$ LANGUAGE plpgsql;