/// 8 方位方向枚举。
///
/// 字母约定（与手势字符串一一对应）：
///
/// ```text
///  UL  U  UR
///   L  ·  R
///  DL  D  DR
/// ```
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Direction {
    U,
    D,
    L,
    R,
    UL,
    UR,
    DL,
    DR,
}

#[derive(Debug, Clone, Copy)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

/// 将方向序列序列化为手势字符串，用于规则匹配键。
///
/// 每个方向映射为 1~2 个大写字母，段间用空字符串直接拼接：
/// `[R, DL, U]` → `"RDLU"`（注：斜向两字母连写，解析时需按最长匹配）
///
/// 当前规则存储里手势字符串直接用这套格式，调用方保持一致即可。
pub fn directions_to_string(dirs: &[Direction]) -> String {
    dirs.iter()
        .map(|d| match d {
            Direction::U => "U",
            Direction::D => "D",
            Direction::L => "L",
            Direction::R => "R",
            Direction::UL => "UL",
            Direction::UR => "UR",
            Direction::DL => "DL",
            Direction::DR => "DR",
        })
        .collect()
}

/// 方向识别器配置。
#[derive(Debug, Clone)]
pub struct GestureRecognizer {
    /// 累积位移达到此阈值才判定为一段方向，单位：像素。
    /// 建议值：30–60。过小会把抖动也识别成方向，过大会漏掉短促手势。
    threshold: f64,
    /// 斜向判定角度区间（弧度）。
    /// 轴向 ±22.5°（π/8）以内识别为纯轴向，其余为斜向。
    diagonal_zone: f64,
}

impl GestureRecognizer {
    pub fn new(threshold: f64) -> Self {
        Self {
            threshold,
            diagonal_zone: std::f64::consts::PI / 8.0, // 22.5°
        }
    }

    pub fn threshold(&self) -> f64 {
        self.threshold
    }

    /// 从轨迹点序列识别方向段列表。
    ///
    /// 算法：累积位移分段
    /// 1. 从上一个"锚点"开始不断累积 dx/dy。
    /// 2. 累积距离超过 threshold 时，根据夹角判定方向，记录一段。
    /// 3. 若与上一段方向相同，合并（不重复记录）。
    /// 4. 以当前点为新锚点，继续累积。
    pub fn recognize(&self, points: &[Point]) -> Vec<Direction> {
        if points.len() < 2 {
            return Vec::new();
        }

        let mut tokens: Vec<Direction> = Vec::new();
        let mut anchor = points[0];
        let mut acc_x = 0.0_f64;
        let mut acc_y = 0.0_f64;

        for pt in &points[1..] {
            acc_x += pt.x - anchor.x;
            acc_y += pt.y - anchor.y;
            anchor = *pt;

            let dist = (acc_x * acc_x + acc_y * acc_y).sqrt();
            if dist < self.threshold {
                continue;
            }

            let dir = angle_to_direction(acc_x, acc_y, self.diagonal_zone);

            // 与上一段不同才记录，避免同向连续抖动产生重复段
            if tokens.last() != Some(&dir) {
                tokens.push(dir);
            }

            // 重置累积，从当前点重新开始
            acc_x = 0.0;
            acc_y = 0.0;
        }

        tokens
    }
}

/// 根据 (dx, dy) 向量的角度判定 8 方位方向。
///
/// macOS 坐标系：x 轴向右为正，y 轴向下为正。
///
/// 角度分区（以正右方向 0° 为基准，顺时针）：
/// ```text
/// 337.5°–22.5°   → R
///  22.5°–67.5°   → DR
///  67.5°–112.5°  → D
/// 112.5°–157.5°  → DL
/// 157.5°–202.5°  → L
/// 202.5°–247.5°  → UL
/// 247.5°–292.5°  → U
/// 292.5°–337.5°  → UR
/// ```
fn angle_to_direction(dx: f64, dy: f64, _diagonal_zone: f64) -> Direction {
    // atan2 返回 (-π, π]，dy 正值表示向下
    let angle = dy.atan2(dx); // 从 +x 轴逆时针计量，但 dy>0 为下

    // 划分 8 个扇区，每扇区 45°（π/4），斜向区间在轴向 ±22.5° 之外
    let pi = std::f64::consts::PI;
    let eighth = pi / 4.0; // 45°

    // 将角度规范到 [0, 2π)
    let a = if angle < 0.0 { angle + 2.0 * pi } else { angle };

    // 按扇区判断（每 45° 一区，从右方向 0° 开始顺时针）
    if a < eighth / 2.0 || a >= 2.0 * pi - eighth / 2.0 {
        Direction::R
    } else if a < eighth + eighth / 2.0 {
        Direction::DR
    } else if a < 2.0 * eighth + eighth / 2.0 {
        Direction::D
    } else if a < 3.0 * eighth + eighth / 2.0 {
        Direction::DL
    } else if a < 4.0 * eighth + eighth / 2.0 {
        Direction::L
    } else if a < 5.0 * eighth + eighth / 2.0 {
        Direction::UL
    } else if a < 6.0 * eighth + eighth / 2.0 {
        Direction::U
    } else {
        Direction::UR
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn pts(coords: &[(f64, f64)]) -> Vec<Point> {
        coords.iter().map(|&(x, y)| Point { x, y }).collect()
    }

    #[test]
    fn test_four_cardinal() {
        let r = GestureRecognizer::new(30.0);

        // 向右
        let p = pts(&[(0.0, 0.0), (100.0, 0.0)]);
        assert_eq!(r.recognize(&p), vec![Direction::R]);

        // 向左
        let p = pts(&[(100.0, 0.0), (0.0, 0.0)]);
        assert_eq!(r.recognize(&p), vec![Direction::L]);

        // 向下（macOS y 轴向下为正）
        let p = pts(&[(0.0, 0.0), (0.0, 100.0)]);
        assert_eq!(r.recognize(&p), vec![Direction::D]);

        // 向上
        let p = pts(&[(0.0, 100.0), (0.0, 0.0)]);
        assert_eq!(r.recognize(&p), vec![Direction::U]);
    }

    #[test]
    fn test_diagonal() {
        let r = GestureRecognizer::new(30.0);

        // 右下 45°
        let p = pts(&[(0.0, 0.0), (100.0, 100.0)]);
        assert_eq!(r.recognize(&p), vec![Direction::DR]);

        // 左上 225°
        let p = pts(&[(100.0, 100.0), (0.0, 0.0)]);
        assert_eq!(r.recognize(&p), vec![Direction::UL]);
    }

    #[test]
    fn test_compound_gesture() {
        let r = GestureRecognizer::new(30.0);

        // 先右后下：R + D
        let p = pts(&[
            (0.0, 0.0),
            (100.0, 0.0),
            (100.0, 100.0),
        ]);
        let result = r.recognize(&p);
        assert!(result.contains(&Direction::R));
        assert!(result.contains(&Direction::D));
    }

    #[test]
    fn test_directions_to_string() {
        let dirs = vec![Direction::R, Direction::DL, Direction::U];
        assert_eq!(directions_to_string(&dirs), "RDLU");
    }

    #[test]
    fn test_noise_suppression() {
        let r = GestureRecognizer::new(30.0);

        // 微小抖动不应产生方向
        let p = pts(&[(0.0, 0.0), (5.0, 3.0), (8.0, -2.0)]);
        assert!(r.recognize(&p).is_empty());
    }
}
