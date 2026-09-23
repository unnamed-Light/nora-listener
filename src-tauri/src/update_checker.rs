use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub current_version: String,
    pub latest_version: String,
    pub has_update: bool,
    pub release_name: String,
    pub release_notes: String,
    pub release_url: String,
    pub published_at: String,
}

#[derive(Debug, PartialEq, Eq)]
struct SemVer {
    major: u64,
    minor: u64,
    patch: u64,
}

impl SemVer {
    fn parse(v: &str) -> Option<Self> {
        let clean = v.trim().trim_start_matches('v').trim_start_matches('V');
        let parts: Vec<&str> = clean.split('.').collect();
        if parts.is_empty() {
            return None;
        }

        let parse_part = |s: &str| -> u64 {
            let numeric: String = s.chars().take_while(|c| c.is_ascii_digit()).collect();
            numeric.parse::<u64>().unwrap_or(0)
        };

        let major = parts.first().map(|s| parse_part(s)).unwrap_or(0);
        let minor = parts.get(1).map(|s| parse_part(s)).unwrap_or(0);
        let patch = parts.get(2).map(|s| parse_part(s)).unwrap_or(0);

        Some(SemVer { major, minor, patch })
    }

    fn is_greater_than(&self, other: &SemVer) -> bool {
        if self.major != other.major {
            return self.major > other.major;
        }
        if self.minor != other.minor {
            return self.minor > other.minor;
        }
        self.patch > other.patch
    }
}

pub fn is_newer_version(latest_tag: &str, current_tag: &str) -> bool {
    match (SemVer::parse(latest_tag), SemVer::parse(current_tag)) {
        (Some(latest), Some(current)) => latest.is_greater_than(&current),
        _ => false,
    }
}

#[derive(Deserialize, Debug)]
struct GithubReleaseResponse {
    tag_name: String,
    name: Option<String>,
    body: Option<String>,
    html_url: String,
    published_at: Option<String>,
}

pub fn check_github_release(repo: &str, current_version: &str) -> Result<UpdateInfo, String> {
    let url = format!("https://api.github.com/repos/{}/releases/latest", repo);

    let client = reqwest::blocking::Client::builder()
        .user_agent("Nora-Listener-Desktop")
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Не удалось инициализировать HTTP клиент: {}", e))?;

    let response = client
        .get(&url)
        .header("Accept", "application/vnd.github.v3+json")
        .send()
        .map_err(|e| format!("Ошибка сетевого запроса к GitHub API: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("GitHub API вернул статус: {}", response.status()));
    }

    let release: GithubReleaseResponse = response
        .json()
        .map_err(|e| format!("Ошибка парсинга ответа релизов GitHub: {}", e))?;

    let latest_version = release.tag_name.trim().to_string();
    let has_update = is_newer_version(&latest_version, current_version);

    Ok(UpdateInfo {
        current_version: current_version.to_string(),
        latest_version,
        has_update,
        release_name: release.name.unwrap_or_else(|| release.tag_name.clone()),
        release_notes: release.body.unwrap_or_default(),
        release_url: release.html_url,
        published_at: release.published_at.unwrap_or_default(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_semver_parse_clean() {
        let v = SemVer::parse("1.2.3").unwrap();
        assert_eq!(v, SemVer { major: 1, minor: 2, patch: 3 });
    }

    #[test]
    fn test_semver_parse_with_v_prefix() {
        let v = SemVer::parse("v1.1.0").unwrap();
        assert_eq!(v, SemVer { major: 1, minor: 1, patch: 0 });
    }

    #[test]
    fn test_semver_parse_with_hotfix_suffix() {
        let v = SemVer::parse("1.0.0-hotfix1").unwrap();
        assert_eq!(v, SemVer { major: 1, minor: 0, patch: 0 });
    }

    #[test]
    fn test_is_newer_version() {
        assert!(is_newer_version("v1.1.1", "v1.1.0"));
        assert!(is_newer_version("1.2.1", "1.2.0"));
        assert!(is_newer_version("1.2.0", "1.1.0"));
        assert!(is_newer_version("2.0.0", "1.9.9"));
        assert!(!is_newer_version("v1.1.0", "v1.1.0"));
        assert!(!is_newer_version("v1.0.2", "v1.1.0"));
        assert!(!is_newer_version("v1.0.0", "v1.0.1"));
    }
}
