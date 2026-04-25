#!/usr/bin/env python3
import argparse
import json
import os
import re
from pathlib import Path

from PIL import Image
import torch
from tqdm import tqdm
from transformers import (
    BlipProcessor,
    BlipForConditionalGeneration,
    CLIPProcessor,
    CLIPModel,
)

STOPWORDS = {
    "a", "an", "the", "and", "or", "of", "with", "on", "in", "to",
    "for", "from", "by", "at", "as", "is", "are", "this", "that",
    "these", "those", "it", "its", "into", "over", "under", "near",
    "icon", "logo", "illustration", "vector", "graphic", "image",
    "png", "jpg", "jpeg", "svg", "webp", "gif",
    "top", "bottom", "left", "right", "front", "back",
    "table", "desk", "sitting", "standing", "lying",
    "background", "foreground", "outline", "symbol", "shape",
    "color", "colored", "white", "black", "blue", "red", "green",
    "yellow", "orange", "purple", "gray", "grey",
    "flat", "simple", "minimal", "modern", "cartoon",
    "platform", "service", "account", "portal", "dashboard", "panel",
    "console", "app", "website", "site", "online", "system",
    "management", "manager", "tool", "tools", "workspace", "workplace",
    "software",
}

SYNONYMS = {
    "padlock": "lock",
    "locker": "lock",
    "locking": "lock",
    "lock" : "lock",
    "keyhole": "key",
    "keys": "key",
    "gear": "settings",
    "gears": "settings",
    "cog": "settings",
    "cogs": "settings",
    "shield": "security",
    "safe": "vault",
    "vault": "vault",
    "email": "mail",
    "envelope": "mail",
    "person": "user",
    "people": "user",
    "profile": "user",
    "password": "password",
}

CORE_TAGS = [
    "lock", "key", "security", "shield", "vault", "password", "login",
    "user", "profile", "mail", "message", "chat", "social", "cloud",
    "server", "database", "code", "app", "website", "internet",
    "settings", "tools", "gear", "phone", "mobile", "desktop", "laptop",
    "finance", "bank", "card", "credit", "money", "wallet", "shopping",
    "store", "cart", "work", "office", "document", "note", "calendar",
    "camera", "photo", "music", "video", "streaming", "movie", "tv",
    "game", "gaming", "travel", "car", "health", "medical", "insurance",
    "crypto", "bitcoin", "payment", "share", "wifi", "globe",
]

APP_NAMES = [
    "Netflix", "Amazon", "Disney", "Disney Plus", "Microsoft", "Google",
    "Apple", "YouTube", "Gmail", "Outlook", "Yahoo", "iCloud",
    "Dropbox", "OneDrive", "GitHub", "GitLab", "Bitbucket", "Slack",
    "Zoom", "Teams", "LinkedIn", "Facebook", "Instagram", "WhatsApp",
    "Telegram", "Signal", "Reddit", "TikTok", "Snapchat", "Pinterest",
    "Twitch", "Spotify", "Hulu", "Prime Video", "Max", "HBO",
    "Paramount Plus", "Peacock", "Uber", "Lyft", "Airbnb", "Booking",
    "Expedia", "PayPal", "Stripe", "Shopify", "eBay", "Walmart",
    "Target", "Best Buy", "Steam", "Epic Games", "Xbox", "PlayStation",
    "Nintendo", "Adobe", "Figma", "Notion", "Trello", "Jira",
    "Confluence", "Atlassian", "Microsoft 365", "Office", "Windows",
    "OpenAI", "ChatGPT", "Gemini", "Claude", "Anthropic", "Perplexity",
    "Mistral", "Cohere", "Hugging Face", "Stability AI", "Midjourney",
    "Runway", "ElevenLabs", "Suno", "Llama", "Meta",
    "Stripe", "PayPal", "Adyen", "Checkout.com", "Braintree", "Square",
    "Worldpay", "Authorize.Net", "Amazon Pay", "Apple Pay", "Google Pay",
    "Alipay", "WeChat Pay", "PayU", "2Checkout", "Skrill", "Neteller",
    "iyzico", "PayTR", "Papara", "ininal", "Paycell",
    "Amazon", "eBay", "Walmart", "Taobao", "Tmall", "Pinduoduo",
    "JD.com", "Temu", "Shopify", "Trendyol", "Hepsiburada", "N11",
    "Netflix", "Disney+", "Amazon Prime Video", "Max", "Hulu",
    "Apple TV+", "Paramount+", "Peacock", "YouTube",
    "Spotify", "Apple Music", "YouTube Music", "Amazon Music", "Deezer",
    "TIDAL", "SoundCloud",
    "Facebook", "Instagram", "TikTok", "X", "LinkedIn", "Snapchat",
    "Pinterest", "Reddit", "WhatsApp", "Messenger", "Telegram", "Signal",
    "WeChat", "QQ", "Line", "Viber", "Discord",
    "Zoom", "Google Meet", "Microsoft Teams", "Webex",
    "AWS", "Microsoft Azure", "Google Cloud", "Alibaba Cloud",
    "Oracle Cloud", "IBM Cloud", "Salesforce", "Tencent Cloud",
    "Huawei Cloud",
    "Google Drive", "Dropbox", "OneDrive", "iCloud", "Box",
    "Binance", "Coinbase", "Kraken", "OKX", "Bybit", "KuCoin",
    "Gate", "Bitget", "MEXC", "HTX", "Upbit", "Crypto.com",
    "Uber", "Lyft", "DiDi", "Grab", "Bolt",
    "Booking.com", "Expedia", "Trip.com", "Agoda", "Airbnb",
    "JPMorgan Chase", "Bank of America", "Wells Fargo", "Citi",
    "HSBC", "BNP Paribas", "Credit Agricole", "Mitsubishi UFJ",
    "Industrial and Commercial Bank of China", "China Construction Bank",
    "Ziraat Bankasi", "VakifBank", "Isbank", "Halkbank", "Garanti BBVA",
    "Akbank", "Yapi Kredi", "QNB", "Denizbank", "TEB",
]

PAYMENT_PROVIDERS = [
    "Stripe", "PayPal", "Adyen", "Checkout.com", "Braintree", "Square",
    "Worldpay", "Authorize.Net", "Amazon Pay", "Apple Pay", "Google Pay",
    "Alipay", "WeChat Pay", "PayU", "2Checkout",
    "iyzico", "PayTR", "Papara", "ininal", "Paycell",
]

BANKS_GLOBAL = [
    "Industrial and Commercial Bank of China",
    "China Construction Bank",
    "Agricultural Bank of China",
    "Bank of China",
    "JPMorgan Chase",
    "Bank of America",
    "HSBC",
    "BNP Paribas",
    "Credit Agricole",
    "Mitsubishi UFJ",
]

BANKS_TURKEY = [
    "Ziraat Bankasi",
    "VakifBank",
    "Isbank",
    "Halkbank",
    "Garanti BBVA",
    "Akbank",
    "Yapi Kredi",
    "QNB",
    "Denizbank",
    "TEB",
]

CRYPTO_EXCHANGES = [
    "Binance", "Bybit", "MEXC", "Gate", "Crypto.com",
    "Bitget", "OKX", "Coinbase", "HTX", "Upbit", "Kraken", "KuCoin",
]

VIDEO_STREAMING = [
    "Netflix", "Amazon Prime Video", "Disney+", "Max", "Hulu",
    "Apple TV+", "Paramount+", "Peacock", "YouTube",
]

MUSIC_STREAMING = [
    "Spotify", "Apple Music", "YouTube Music", "Amazon Music",
    "Deezer", "TIDAL", "SoundCloud",
]

SOCIAL_NETWORKS = [
    "Facebook", "Instagram", "TikTok", "YouTube", "X",
    "LinkedIn", "Snapchat", "Pinterest", "Reddit", "WhatsApp",
]

MESSAGING_APPS = [
    "WhatsApp", "WeChat", "Messenger", "Telegram", "Snapchat",
    "QQ", "Signal", "Line", "Viber", "Discord",
]

VIDEO_CONFERENCING = [
    "Zoom", "Google Meet", "Microsoft Teams", "Webex",
]

CLOUD_PROVIDERS = [
    "AWS", "Microsoft Azure", "Google Cloud", "Alibaba Cloud",
    "Oracle Cloud", "IBM Cloud", "Salesforce", "Tencent Cloud", "Huawei Cloud",
]

CLOUD_STORAGE = [
    "Google Drive", "Dropbox", "OneDrive", "iCloud", "Box",
]

ECOMMERCE_MARKETPLACES = [
    "Amazon", "Taobao", "Tmall", "Pinduoduo", "JD.com",
    "Temu", "eBay", "Walmart", "Shopify",
    "Trendyol", "Hepsiburada", "N11",
]

RIDE_HAILING = [
    "Uber", "Lyft", "DiDi", "Grab", "Bolt",
]

TRAVEL_BOOKING = [
    "Booking.com", "Expedia", "Trip.com", "Agoda", "Airbnb",
]

EMAIL_PROVIDERS = [
    "Gmail", "Outlook", "Outlook.com", "Yahoo Mail", "iCloud Mail",
    "Proton Mail", "Zoho Mail", "Fastmail", "GMX",
]

DEV_PLATFORMS = [
    "GitHub", "GitLab", "Bitbucket", "Azure DevOps", "SourceForge",
    "Gitea", "Gitee", "Codeberg",
]

CI_CD_TOOLS = [
    "Jenkins", "GitHub Actions", "GitLab CI", "CircleCI", "Travis CI",
    "TeamCity", "Bamboo", "Azure Pipelines",
]

DEV_IDES = [
    "Visual Studio Code", "Visual Studio", "IntelliJ IDEA", "PyCharm",
    "WebStorm", "Android Studio", "Xcode", "Eclipse",
]

API_PLATFORMS = [
    "Postman", "RapidAPI", "Apigee", "Kong", "MuleSoft",
    "AWS API Gateway", "Azure API Management", "Swagger",
]

DOC_PLATFORMS = [
    "Confluence", "GitBook", "Read the Docs", "Notion", "Docusaurus",
]

PACKAGE_REGISTRIES = [
    "npm", "PyPI", "Maven", "NuGet", "RubyGems", "Docker Hub",
    "GitHub Packages",
]

TESTING_PLATFORMS = [
    "BrowserStack", "Sauce Labs", "TestRail", "Cypress", "Selenium",
]

MOOC_PLATFORMS = [
    "Coursera", "edX", "Udacity", "FutureLearn", "Khan Academy",
    "Udemy", "Pluralsight", "Skillshare", "LinkedIn Learning",
]

LMS_PLATFORMS = [
    "Canvas", "Moodle", "Blackboard", "Google Classroom", "Open edX",
    "Sakai",
]

LANGUAGE_LEARNING = [
    "Duolingo", "Babbel", "Rosetta Stone", "Busuu", "Memrise",
]

NOTE_APPS = [
    "Notion", "Evernote", "OneNote", "Google Keep",
]

FITNESS_APPS = [
    "Strava", "Fitbit", "Apple Fitness+", "Nike Training Club",
    "Peloton", "MyFitnessPal",
]

WEARABLE_BRANDS = [
    "Fitbit", "Garmin", "Apple Watch", "Whoop", "Oura",
]

WELLNESS_APPS = [
    "Calm", "Headspace", "Sleep Cycle",
]

DESIGN_TOOLS = [
    "Adobe", "Adobe Creative Cloud", "Figma", "Canva", "Sketch",
    "Affinity",
]

PHOTO_TOOLS = [
    "Photoshop", "Lightroom", "Snapseed", "Pixlr",
]

VIDEO_TOOLS = [
    "Premiere Pro", "Final Cut Pro", "DaVinci Resolve",
    "After Effects", "CapCut",
]

MUSIC_TOOLS = [
    "Ableton Live", "FL Studio", "Logic Pro", "Pro Tools",
    "GarageBand", "Audacity",
]

STOCK_LIBRARIES = [
    "Shutterstock", "Adobe Stock", "Unsplash", "Pexels",
    "Getty Images", "Envato",
]

GAMING_PLATFORMS = [
    "Steam", "Epic Games Store", "GOG", "itch.io", "Xbox", "PlayStation",
    "Nintendo", "Battle.net", "EA", "Ubisoft Connect",
]

GAME_SUBSCRIPTIONS = [
    "Xbox Game Pass", "PlayStation Plus", "Nintendo Switch Online",
    "EA Play", "Ubisoft+",
]

SMART_HOME_PLATFORMS = [
    "Apple Home", "Google Home", "Amazon Alexa", "SmartThings",
    "HomeKit", "Nest",
]

SMART_LIGHTING = [
    "Philips Hue", "LIFX", "Nanoleaf", "TP-Link Kasa",
]

HOME_SECURITY = [
    "Ring", "Arlo", "Eufy", "Nest", "SimpliSafe",
]

THERMOSTATS = [
    "Nest", "Ecobee",
]

ROBOT_VACUUM = [
    "Roomba", "Roborock", "Ecovacs", "iRobot",
]

SMART_LOCKS = [
    "August", "Yale", "Schlage",
]

MOBILE_OPERATORS = [
    "China Mobile", "Bharti Airtel", "Reliance Jio", "China Telecom",
    "China Unicom", "Vodafone", "Orange", "Telefonica", "MTN",
    "America Movil", "Deutsche Telekom", "Verizon", "AT&T", "T-Mobile",
]

PROJECT_MANAGEMENT_TOOLS = [
    "Asana", "Trello", "Jira", "Monday.com", "ClickUp", "Basecamp",
    "Wrike", "Smartsheet", "Airtable", "Todoist", "Microsoft Project",
    "Teamwork",
]

CRM_PLATFORMS = [
    "Salesforce", "HubSpot", "Microsoft Dynamics 365", "Zoho CRM",
    "Pipedrive",
]

HR_PLATFORMS = [
    "Workday", "ADP", "BambooHR", "Gusto", "Rippling",
]

OFFICE_SUITES = [
    "Microsoft 365", "Google Workspace", "Zoho Workplace",
]

SCHEDULING_TOOLS = [
    "Calendly", "Doodle", "Microsoft Bookings",
]

KNOWLEDGE_BASES = [
    "Confluence", "Notion", "Slite", "Guru",
]

ISSUE_TRACKERS = [
    "Jira", "Linear", "YouTrack", "GitHub Issues",
]

DELIVERY_COURIERS = [
    "DHL", "FedEx", "UPS", "USPS", "Royal Mail", "DPD", "Aramex",
]

AUDIOBOOK_PLATFORMS = [
    "Audible", "Scribd", "Apple Books",
]

EBOOK_PLATFORMS = [
    "Kindle", "Kobo", "Apple Books",
]

PODCAST_PLATFORMS = [
    "Apple Podcasts", "Spotify", "Pocket Casts", "Overcast",
]

NEWS_PLATFORMS = [
    "Apple News", "Google News", "Flipboard",
]

RADIO_PLATFORMS = [
    "TuneIn", "iHeartRadio",
]

AIRLINES = [
    "Turkish Airlines", "Emirates", "Qatar Airways", "Delta", "United",
    "Lufthansa", "British Airways", "American Airlines",
]

CAR_RENTAL = [
    "Hertz", "Avis", "Enterprise", "Sixt", "Budget",
]

TRANSIT_APPS = [
    "Citymapper", "Moovit",
]

WEB_HOSTING_PLATFORMS = [
    "GoDaddy", "Namecheap", "Bluehost", "HostGator", "Wix",
    "Squarespace", "Netlify", "Vercel",
]

CDN_PROVIDERS = [
    "Cloudflare", "Akamai", "Fastly", "CloudFront",
]

DNS_PROVIDERS = [
    "Cloudflare", "Route 53", "Google Cloud DNS",
]

OBSERVABILITY_TOOLS = [
    "Datadog", "New Relic", "Grafana", "Sentry", "PagerDuty",
]

STATUS_PAGE_PLATFORMS = [
    "Statuspage", "Better Uptime",
]

DATABASE_PLATFORMS = [
    "MongoDB Atlas", "Amazon RDS", "Azure SQL", "Cloud SQL",
]

CONTAINER_PLATFORMS = [
    "Docker", "Kubernetes", "OpenShift", "EKS", "GKE", "AKS",
]

SERVERLESS_PLATFORMS = [
    "AWS Lambda", "Azure Functions", "Google Cloud Functions",
    "Cloudflare Workers",
]

IAM_PLATFORMS = [
    "Okta", "Auth0", "Azure Active Directory", "AWS IAM",
]

ANALYTICS_TOOLS = [
    "Google Analytics", "Mixpanel", "Amplitude",
]

SUPPORT_PLATFORMS = [
    "Zendesk", "Freshdesk", "Intercom", "Help Scout",
    "Jira Service Management",
]

PASSWORD_MANAGERS = [
    "1Password", "Bitwarden", "LastPass", "Dashlane", "Keeper",
]

AUTHENTICATORS = [
    "Google Authenticator", "Microsoft Authenticator", "Authy",
    "Duo Mobile", "Okta Verify",
]

BREACH_ALERTS = [
    "Have I Been Pwned",
]

TICKETING_PLATFORMS = [
    "Ticketmaster", "Eventbrite", "StubHub",
]

VOIP_SERVICES = [
    "Skype", "Google Voice", "Zoom Phone",
]

GOV_PORTALS = [
    "e-Devlet", "GOV.UK", "USA.gov",
]

ACCOUNTING_PLATFORMS = [
    "QuickBooks", "Xero", "FreshBooks", "Sage", "Wave",
]

BILLING_PLATFORMS = [
    "Chargebee", "Recurly", "Zuora", "Stripe Billing",
]

PAYROLL_PLATFORMS = [
    "Gusto", "ADP", "Paychex", "Workday",
]

POS_PLATFORMS = [
    "Square", "Toast", "Lightspeed",
]

EQUITY_PLATFORMS = [
    "Carta", "Pulley",
]

CARD_NETWORKS = [
    "Visa", "Mastercard", "American Express",
]

MONEY_TRANSFER = [
    "Wise", "Western Union", "Remitly", "PaySend",
]

BROKERAGES = [
    "Robinhood", "Fidelity", "Charles Schwab", "E*TRADE",
    "Interactive Brokers",
]

CRYPTO_WALLETS = [
    "MetaMask", "Trust Wallet", "Coinbase Wallet", "Ledger", "Trezor",
]

AI_COMPANY_TAGS = [
    "OpenAI", "ChatGPT", "Gemini", "Claude", "Anthropic", "Perplexity",
    "Mistral", "Cohere", "Hugging Face", "Stability AI", "Midjourney",
    "Runway", "ElevenLabs", "Suno", "Llama", "Meta",
]

APP_NAMES += (
    EMAIL_PROVIDERS
    + DEV_PLATFORMS
    + CI_CD_TOOLS
    + DEV_IDES
    + API_PLATFORMS
    + DOC_PLATFORMS
    + PACKAGE_REGISTRIES
    + TESTING_PLATFORMS
    + MOOC_PLATFORMS
    + LMS_PLATFORMS
    + LANGUAGE_LEARNING
    + NOTE_APPS
    + FITNESS_APPS
    + WEARABLE_BRANDS
    + WELLNESS_APPS
    + DESIGN_TOOLS
    + PHOTO_TOOLS
    + VIDEO_TOOLS
    + MUSIC_TOOLS
    + STOCK_LIBRARIES
    + GAMING_PLATFORMS
    + GAME_SUBSCRIPTIONS
    + SMART_HOME_PLATFORMS
    + SMART_LIGHTING
    + HOME_SECURITY
    + THERMOSTATS
    + ROBOT_VACUUM
    + SMART_LOCKS
    + MOBILE_OPERATORS
    + PROJECT_MANAGEMENT_TOOLS
    + CRM_PLATFORMS
    + HR_PLATFORMS
    + OFFICE_SUITES
    + SCHEDULING_TOOLS
    + KNOWLEDGE_BASES
    + ISSUE_TRACKERS
    + DELIVERY_COURIERS
    + AUDIOBOOK_PLATFORMS
    + EBOOK_PLATFORMS
    + PODCAST_PLATFORMS
    + NEWS_PLATFORMS
    + RADIO_PLATFORMS
    + AIRLINES
    + CAR_RENTAL
    + TRANSIT_APPS
    + WEB_HOSTING_PLATFORMS
    + CDN_PROVIDERS
    + DNS_PROVIDERS
    + OBSERVABILITY_TOOLS
    + STATUS_PAGE_PLATFORMS
    + DATABASE_PLATFORMS
    + CONTAINER_PLATFORMS
    + SERVERLESS_PLATFORMS
    + IAM_PLATFORMS
    + ANALYTICS_TOOLS
    + SUPPORT_PLATFORMS
    + PASSWORD_MANAGERS
    + AUTHENTICATORS
    + BREACH_ALERTS
    + TICKETING_PLATFORMS
    + VOIP_SERVICES
    + GOV_PORTALS
    + ACCOUNTING_PLATFORMS
    + BILLING_PLATFORMS
    + PAYROLL_PLATFORMS
    + POS_PLATFORMS
    + EQUITY_PLATFORMS
    + CARD_NETWORKS
    + MONEY_TRANSFER
    + BROKERAGES
    + CRYPTO_WALLETS
)

EXTRA_TAG_RULES = [
    {
        "pattern": r"ai_tools__ai_account",
        "tags": AI_COMPANY_TAGS + ["ai", "llm", "assistant", "chatbot"],
    },
    {
        "pattern": r"ai_tools__personal_ai_account",
        "tags": AI_COMPANY_TAGS + ["ai", "personal", "assistant"],
    },
    {
        "pattern": r"ai_tools__shared_ai_account",
        "tags": AI_COMPANY_TAGS + ["ai", "shared", "assistant"],
    },
    {
        "pattern": r"ai_tools__team_ai_account",
        "tags": AI_COMPANY_TAGS + ["ai", "team", "collaboration"],
    },
    {
        "pattern": r"ai_tools__assistant_ai",
        "tags": AI_COMPANY_TAGS + ["ai", "assistant"],
    },
    {
        "pattern": r"ai_tools__chatbot_service",
        "tags": AI_COMPANY_TAGS + ["ai", "chatbot"],
    },
    {
        "pattern": r"ai_tools__text_generation",
        "tags": AI_COMPANY_TAGS + ["ai", "text", "writing"],
    },
    {
        "pattern": r"ai_tools__llm_platform",
        "tags": AI_COMPANY_TAGS + ["ai", "llm", "platform"],
    },
    {
        "pattern": r"finance_business__payment_gateway|shopping_ecommerce__payment_service|web_services__payment_portal|finance_crypto__payment",
        "tags": PAYMENT_PROVIDERS,
    },
    {
        "pattern": r"finance_crypto__crypto_exchange",
        "tags": CRYPTO_EXCHANGES,
    },
    {
        "pattern": r"finance_crypto__bank|finance_crypto__online_bank|finance_crypto__checking_account|finance_crypto__savings_account|finance_business__business_bank_account",
        "tags": BANKS_GLOBAL + BANKS_TURKEY,
    },
    {
        "pattern": r"streaming_entertainment__video_streaming|streaming_entertainment__tv_platform|streaming_entertainment__movie_platform|streaming_entertainment__video_library|media_creative__video_platform",
        "tags": VIDEO_STREAMING,
    },
    {
        "pattern": r"streaming_entertainment__music_streaming|streaming_entertainment__audio_platform|media_creative__music_production|media_creative__audio_editing",
        "tags": MUSIC_STREAMING,
    },
    {
        "pattern": r"social_communication__social_network|social_communication__social_platform|social_communication__social_account|social_communication__community_platform",
        "tags": SOCIAL_NETWORKS,
    },
    {
        "pattern": r"social_communication__messaging_service|social_communication__group_chat|social_communication__team_chat|social_communication__secure_messaging|social_communication__chat_platform",
        "tags": MESSAGING_APPS,
    },
    {
        "pattern": r"social_communication__video_call_platform|social_communication__conference_service",
        "tags": VIDEO_CONFERENCING,
    },
    {
        "pattern": r"cloud_infrastructure__cloud_platform|cloud_infrastructure__cloud_console|cloud_infrastructure__cloud_account|cloud_infrastructure__hosting_platform|web_services__cloud_service",
        "tags": CLOUD_PROVIDERS,
    },
    {
        "pattern": r"cloud_infrastructure__cloud_storage|cloud_infrastructure__object_storage|web_services__storage",
        "tags": CLOUD_STORAGE,
    },
    {
        "pattern": r"cloud_infrastructure__cdn_service",
        "tags": CDN_PROVIDERS,
    },
    {
        "pattern": r"cloud_infrastructure__dns_service",
        "tags": DNS_PROVIDERS,
    },
    {
        "pattern": r"cloud_infrastructure__monitoring_service|cloud_infrastructure__logging_platform|cloud_infrastructure__alerting_service",
        "tags": OBSERVABILITY_TOOLS,
    },
    {
        "pattern": r"cloud_infrastructure__database_service|cloud_infrastructure__data_platform",
        "tags": DATABASE_PLATFORMS,
    },
    {
        "pattern": r"cloud_infrastructure__container_platform",
        "tags": CONTAINER_PLATFORMS,
    },
    {
        "pattern": r"cloud_infrastructure__serverless_platform",
        "tags": SERVERLESS_PLATFORMS,
    },
    {
        "pattern": r"cloud_infrastructure__iam_service|cloud_infrastructure__key_management|cloud_infrastructure__secrets_manager",
        "tags": IAM_PLATFORMS,
    },
    {
        "pattern": r"cloud_infrastructure__build_pipeline|cloud_infrastructure__ci_cd_platform|cloud_infrastructure__deployment_service|cloud_infrastructure__devops_tool",
        "tags": CI_CD_TOOLS,
    },
    {
        "pattern": r"cloud_infrastructure__gateway_service|cloud_infrastructure__api_service",
        "tags": API_PLATFORMS,
    },
    {
        "pattern": r"cloud_infrastructure__repository_service|cloud_infrastructure__code_platform",
        "tags": DEV_PLATFORMS,
    },
    {
        "pattern": r"shopping_ecommerce__marketplace|shopping_ecommerce__shopping_platform|shopping_ecommerce__ecommerce_site|shopping_ecommerce__online_store",
        "tags": ECOMMERCE_MARKETPLACES,
    },
    {
        "pattern": r"travel_transport__ride_hailing",
        "tags": RIDE_HAILING,
    },
    {
        "pattern": r"travel_transport__booking_service|travel_transport__hotel_booking|travel_transport__flight_booking|travel_transport__travel_platform|travel_transport__travel_service",
        "tags": TRAVEL_BOOKING,
    },
    {
        "pattern": r"developer_tech__git_service|developer_tech__repository|developer_tech__version_control",
        "tags": DEV_PLATFORMS,
    },
    {
        "pattern": r"developer_tech__ci_cd_tool|developer_tech__build_tool|developer_tech__deployment_tool|developer_tech__automation_tool",
        "tags": CI_CD_TOOLS,
    },
    {
        "pattern": r"developer_tech__code_editor|developer_tech__ide",
        "tags": DEV_IDES,
    },
    {
        "pattern": r"developer_tech__documentation_platform",
        "tags": DOC_PLATFORMS,
    },
    {
        "pattern": r"developer_tech__package_registry|developer_tech__dependency_manager",
        "tags": PACKAGE_REGISTRIES,
    },
    {
        "pattern": r"developer_tech__api_platform|developer_tech__developer_platform",
        "tags": API_PLATFORMS,
    },
    {
        "pattern": r"developer_tech__testing_platform",
        "tags": TESTING_PLATFORMS,
    },
    {
        "pattern": r"education_learning__online_course|education_learning__course_library|education_learning__training_platform|education_learning__education_platform|education_learning__learning_platform|education_learning__skill_development",
        "tags": MOOC_PLATFORMS,
    },
    {
        "pattern": r"education_learning__learning_platform|education_learning__study_tools|education_learning__student_account|education_learning__university_portal|education_learning__academic_records|education_learning__education_account",
        "tags": LMS_PLATFORMS,
    },
    {
        "pattern": r"education_learning__language_learning",
        "tags": LANGUAGE_LEARNING,
    },
    {
        "pattern": r"education_learning__learning_notes",
        "tags": NOTE_APPS,
    },
    {
        "pattern": r"finance_business__accounting_platform|finance_business__bookkeeping_service|finance_business__financial_reporting|finance_business__tax_management|finance_business__billing_system",
        "tags": ACCOUNTING_PLATFORMS,
    },
    {
        "pattern": r"finance_business__invoicing_platform|finance_business__subscription_billing",
        "tags": BILLING_PLATFORMS,
    },
    {
        "pattern": r"finance_business__payroll_system|finance_business__expense_management",
        "tags": PAYROLL_PLATFORMS,
    },
    {
        "pattern": r"finance_business__pos_system",
        "tags": POS_PLATFORMS,
    },
    {
        "pattern": r"finance_business__crm_finance|finance_business__sales_platform",
        "tags": CRM_PLATFORMS,
    },
    {
        "pattern": r"finance_business__equity_management|finance_business__shareholder_portal",
        "tags": EQUITY_PLATFORMS,
    },
    {
        "pattern": r"finance_crypto__credit_card|finance_crypto__debit_card|finance_crypto__virtual_card|finance_crypto__prepaid_card",
        "tags": CARD_NETWORKS,
    },
    {
        "pattern": r"finance_crypto__wallet|finance_crypto__crypto_wallet|finance_crypto__digital_wallet|finance_crypto__hardware_wallet",
        "tags": CRYPTO_WALLETS,
    },
    {
        "pattern": r"finance_crypto__money_transfer",
        "tags": MONEY_TRANSFER,
    },
    {
        "pattern": r"finance_crypto__stocks|finance_crypto__trading|finance_crypto__portfolio",
        "tags": BROKERAGES,
    },
    {
        "pattern": r"health_fitness__fitness_app|health_fitness__workout_platform|health_fitness__personal_training",
        "tags": FITNESS_APPS,
    },
    {
        "pattern": r"health_fitness__sleep_tracking|health_fitness__wearable_account|health_fitness__device_health",
        "tags": WEARABLE_BRANDS + WELLNESS_APPS,
    },
    {
        "pattern": r"health_fitness__nutrition_tracking|health_fitness__habit_tracking",
        "tags": WELLNESS_APPS + FITNESS_APPS,
    },
    {
        "pattern": r"media_creative__design_platform|media_creative__graphic_design|media_creative__ui_ux_design|media_creative__brand_design",
        "tags": DESIGN_TOOLS,
    },
    {
        "pattern": r"media_creative__photo_editing|media_creative__photo_service",
        "tags": PHOTO_TOOLS,
    },
    {
        "pattern": r"media_creative__video_editing|media_creative__motion_design",
        "tags": VIDEO_TOOLS,
    },
    {
        "pattern": r"media_creative__music_production|media_creative__audio_editing",
        "tags": MUSIC_TOOLS,
    },
    {
        "pattern": r"media_creative__asset_library|media_creative__image_library|media_creative__sound_library|media_creative__creative_storage",
        "tags": STOCK_LIBRARIES,
    },
    {
        "pattern": r"misc_other__helpdesk_service|misc_other__support_portal|web_services__support_portal|web_services__customer_service",
        "tags": SUPPORT_PLATFORMS,
    },
    {
        "pattern": r"misc_other__status_page|cloud_infrastructure__status_dashboard",
        "tags": STATUS_PAGE_PLATFORMS,
    },
    {
        "pattern": r"misc_other__analytics_misc|misc_other__data_dashboard|web_services__dashboard|web_services__dev_dashboard",
        "tags": ANALYTICS_TOOLS,
    },
    {
        "pattern": r"personal_lifestyle__email_account|personal_lifestyle__personal_email|personal_lifestyle__work_email|web_services__email|web_services__mailbox",
        "tags": EMAIL_PROVIDERS,
    },
    {
        "pattern": r"personal_lifestyle__phone_service|personal_lifestyle__mobile_account|utilities_government__mobile_operator|utilities_government__internet_provider",
        "tags": MOBILE_OPERATORS,
    },
    {
        "pattern": r"personal_lifestyle__events_tickets",
        "tags": TICKETING_PLATFORMS,
    },
    {
        "pattern": r"personal_lifestyle__voip_service",
        "tags": VOIP_SERVICES,
    },
    {
        "pattern": r"security_identity__password|security_identity__vault|security_identity__work_vault|security_identity__family_vault",
        "tags": PASSWORD_MANAGERS,
    },
    {
        "pattern": r"security_identity__authenticator_app|security_identity__two_factor_auth",
        "tags": AUTHENTICATORS,
    },
    {
        "pattern": r"security_identity__breach_alert",
        "tags": BREACH_ALERTS,
    },
    {
        "pattern": r"shopping_ecommerce__delivery_service|shopping_ecommerce__courier_service|shopping_ecommerce__order_tracking",
        "tags": DELIVERY_COURIERS,
    },
    {
        "pattern": r"smart_home_iot__smart_home_platform|smart_home_iot__home_automation|smart_home_iot__iot_hub|smart_home_iot__device_account",
        "tags": SMART_HOME_PLATFORMS,
    },
    {
        "pattern": r"smart_home_iot__smart_lighting",
        "tags": SMART_LIGHTING,
    },
    {
        "pattern": r"smart_home_iot__security_camera|smart_home_iot__doorbell_camera|smart_home_iot__alarm_system",
        "tags": HOME_SECURITY,
    },
    {
        "pattern": r"smart_home_iot__thermostat|smart_home_iot__climate_control",
        "tags": THERMOSTATS,
    },
    {
        "pattern": r"smart_home_iot__robot_vacuum",
        "tags": ROBOT_VACUUM,
    },
    {
        "pattern": r"smart_home_iot__smart_lock",
        "tags": SMART_LOCKS,
    },
    {
        "pattern": r"streaming_entertainment__audiobook_service",
        "tags": AUDIOBOOK_PLATFORMS,
    },
    {
        "pattern": r"streaming_entertainment__ebook_service",
        "tags": EBOOK_PLATFORMS,
    },
    {
        "pattern": r"streaming_entertainment__podcast_platform",
        "tags": PODCAST_PLATFORMS,
    },
    {
        "pattern": r"streaming_entertainment__news_platform|streaming_entertainment__magazine_service",
        "tags": NEWS_PLATFORMS,
    },
    {
        "pattern": r"streaming_entertainment__radio_service",
        "tags": RADIO_PLATFORMS,
    },
    {
        "pattern": r"gaming_esports__",
        "tags": GAMING_PLATFORMS + GAME_SUBSCRIPTIONS,
    },
    {
        "pattern": r"travel_transport__airline_service",
        "tags": AIRLINES,
    },
    {
        "pattern": r"travel_transport__car_rental",
        "tags": CAR_RENTAL,
    },
    {
        "pattern": r"travel_transport__public_transport",
        "tags": TRANSIT_APPS,
    },
    {
        "pattern": r"travel_transport__accommodation_service",
        "tags": TRAVEL_BOOKING,
    },
    {
        "pattern": r"utilities_government__e_government|utilities_government__government_portal|utilities_government__citizen_account",
        "tags": GOV_PORTALS,
    },
    {
        "pattern": r"utilities_government__invoice_payment|utilities_government__utility_billing",
        "tags": PAYMENT_PROVIDERS,
    },
    {
        "pattern": r"web_services__hosting|web_services__web_platform|web_services__website",
        "tags": WEB_HOSTING_PLATFORMS,
    },
    {
        "pattern": r"web_services__cdn",
        "tags": CDN_PROVIDERS,
    },
    {
        "pattern": r"web_services__monitoring",
        "tags": OBSERVABILITY_TOOLS,
    },
    {
        "pattern": r"web_services__api_service|web_services__developer_platform|web_services__dev_dashboard",
        "tags": API_PLATFORMS,
    },
    {
        "pattern": r"web_services__payment_portal|web_services__checkout",
        "tags": PAYMENT_PROVIDERS,
    },
    {
        "pattern": r"web_services__storage",
        "tags": CLOUD_STORAGE,
    },
    {
        "pattern": r"web_services__support_portal|web_services__customer_service",
        "tags": SUPPORT_PLATFORMS,
    },
    {
        "pattern": r"work_productivity__project_management|work_productivity__kanban_board|work_productivity__task_manager",
        "tags": PROJECT_MANAGEMENT_TOOLS,
    },
    {
        "pattern": r"work_productivity__crm_platform",
        "tags": CRM_PLATFORMS,
    },
    {
        "pattern": r"work_productivity__office_suite|work_productivity__document_service|work_productivity__calendar_service",
        "tags": OFFICE_SUITES,
    },
    {
        "pattern": r"work_productivity__meeting_scheduler",
        "tags": SCHEDULING_TOOLS,
    },
    {
        "pattern": r"work_productivity__wiki_platform|work_productivity__knowledge_base",
        "tags": KNOWLEDGE_BASES,
    },
    {
        "pattern": r"work_productivity__hr_platform",
        "tags": HR_PLATFORMS,
    },
    {
        "pattern": r"work_productivity__issue_tracker",
        "tags": ISSUE_TRACKERS,
    },
    {
        "pattern": r"work_productivity__collaboration_platform|work_productivity__team_workspace|work_productivity__workspace|work_productivity__work_platform",
        "tags": MESSAGING_APPS + VIDEO_CONFERENCING,
    },
]


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def normalize_tag(tag: str) -> str:
    tag = tag.lower().strip()
    tag = SYNONYMS.get(tag, tag)
    tag = slugify(tag)
    return tag


def tokenize(text: str):
    return re.findall(r"[a-z0-9]+", text.lower())


def tags_from_text(text: str):
    tags = []
    for tok in tokenize(text):
        if tok in STOPWORDS:
            continue
        if len(tok) <= 2:
            continue
        tags.append(normalize_tag(tok))
    return tags


def title_from_caption(caption: str) -> str:
    t = caption.strip().rstrip(".")
    if not t:
        return ""
    return t[:1].upper() + t[1:]


def build_text_features(clip_model, clip_processor, labels, prompt_fn, device):
    prompts = [prompt_fn(label) for label in labels]
    inputs = clip_processor(text=prompts, return_tensors="pt", padding=True)
    inputs = {k: v.to(device) for k, v in inputs.items()}
    with torch.no_grad():
        feats = clip_model.get_text_features(**inputs)
    feats = feats / feats.norm(dim=-1, keepdim=True)
    return feats


def apply_extra_tag_rules(rel_path: str, tags: set):
    for rule in EXTRA_TAG_RULES:
        if re.search(rule["pattern"], rel_path):
            for t in rule["tags"]:
                nt = normalize_tag(t)
                if nt and nt not in STOPWORDS:
                    tags.add(nt)


def load_existing(output_path: Path):
    if not output_path.exists():
        return {}, []
    try:
        with output_path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        items = data.get("items", [])
        errors = data.get("errors", [])
        items_by_id = {
            item.get("id"): item
            for item in items
            if isinstance(item, dict) and item.get("id")
        }
        return items_by_id, list(errors)
    except Exception:
        return {}, []


def write_output(output_path: Path, items_by_id, errors):
    merged_items = sorted(items_by_id.values(), key=lambda x: x.get("id", ""))
    output_data = {
        "count": len(merged_items),
        "errors": errors,
        "items": merged_items,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2, ensure_ascii=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--images",
        default="frontend/assets/images/avatars_128",
        help="Directory containing avatar PNGs",
    )
    parser.add_argument(
        "--output",
        default="frontend/assets/images/avatars_128/avatars.json",
        help="Output JSON file",
    )
    parser.add_argument(
        "--device",
        default=None,
        help="cpu | mps (default: auto)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Limit number of images (0 = no limit)",
    )
    parser.add_argument(
        "--offset",
        type=int,
        default=0,
        help="Skip the first N images before processing",
    )
    parser.add_argument(
        "--append",
        action="store_true",
        help="Merge results into existing output JSON (by id)",
    )
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Use local model cache only (no network calls)",
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=0,
        help="Write output every N images (0 = only at the end)",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Skip images already present in output JSON",
    )
    args = parser.parse_args()

    base_dir = Path(args.images)
    if not base_dir.exists():
        raise SystemExit(f"Images directory not found: {base_dir}")

    device = args.device
    if device is None:
        device = "mps" if torch.backends.mps.is_available() else "cpu"

    print(f"Using device: {device}")

    # Load models once
    print("Loading BLIP for captioning...")
    blip_processor = BlipProcessor.from_pretrained(
        "Salesforce/blip-image-captioning-base",
        local_files_only=args.offline,
    )
    blip_model = BlipForConditionalGeneration.from_pretrained(
        "Salesforce/blip-image-captioning-base",
        local_files_only=args.offline,
    ).to(device)

    print("Loading CLIP for tag scoring...")
    clip_processor = CLIPProcessor.from_pretrained(
        "openai/clip-vit-base-patch32",
        local_files_only=args.offline,
    )
    clip_model = CLIPModel.from_pretrained(
        "openai/clip-vit-base-patch32",
        local_files_only=args.offline,
    ).to(device)

    # Prepare tag labels
    core_labels = [normalize_tag(t) for t in CORE_TAGS]
    core_labels = sorted(set(core_labels))

    app_label_map = {normalize_tag(n): n for n in APP_NAMES}
    app_labels = sorted(app_label_map.keys())

    core_text_feats = build_text_features(
        clip_model,
        clip_processor,
        core_labels,
        lambda label: f"an icon of {label}",
        device,
    )

    app_text_feats = build_text_features(
        clip_model,
        clip_processor,
        app_labels,
        lambda label: f"the logo of {app_label_map[label]}",
        device,
    )

    # Gather images
    images = sorted(base_dir.rglob("*.png"))
    if args.offset and args.offset > 0:
        images = images[args.offset :]
    if args.limit and args.limit > 0:
        images = images[: args.limit]

    output_path = Path(args.output)
    items_by_id = {}
    errors = []
    if args.append or args.resume:
        items_by_id, errors = load_existing(output_path)

    processed_in_chunk = 0

    for img_path in tqdm(images, desc="Processing"):
        rel_path = img_path.relative_to(base_dir).as_posix()
        img_id = rel_path.rsplit(".", 1)[0]
        if args.resume and img_id in items_by_id:
            continue

        try:
            with Image.open(img_path) as im:
                image = im.convert("RGB")

            # Caption
            inputs = blip_processor(images=image, return_tensors="pt").to(device)
            with torch.no_grad():
                output = blip_model.generate(**inputs, max_new_tokens=24)
            caption = blip_processor.decode(output[0], skip_special_tokens=True)

            # CLIP image features
            clip_inputs = clip_processor(images=image, return_tensors="pt")
            clip_inputs = {k: v.to(device) for k, v in clip_inputs.items()}
            with torch.no_grad():
                image_feat = clip_model.get_image_features(**clip_inputs)
            image_feat = image_feat / image_feat.norm(dim=-1, keepdim=True)

            # Tags from caption and path
            tags = set()
            tags.update(tags_from_text(rel_path))
            tags.update(tags_from_text(caption))
            apply_extra_tag_rules(rel_path, tags)

            # Core tag scoring
            core_scores = (image_feat @ core_text_feats.T).squeeze(0)
            core_scores = core_scores.cpu()
            core_top = torch.topk(core_scores, k=min(8, len(core_labels)))
            for idx, score in zip(core_top.indices.tolist(), core_top.values.tolist()):
                if score >= 0.23:
                    tags.add(core_labels[idx])

            # App tag scoring
            app_scores = (image_feat @ app_text_feats.T).squeeze(0)
            app_scores = app_scores.cpu()
            app_top = torch.topk(app_scores, k=min(4, len(app_labels)))
            for idx, score in zip(app_top.indices.tolist(), app_top.values.tolist()):
                if score >= 0.27:
                    tags.add(app_labels[idx])

            # Clean tags
            tags = [t for t in tags if t and t not in STOPWORDS]
            tags = sorted(set(tags))

            items_by_id[img_id] = {
                "id": img_id,
                "path": rel_path,
                "title": title_from_caption(caption),
                "caption": caption,
                "tags": tags,
            }
        except Exception as e:
            errors.append({"path": rel_path, "error": str(e)})

        processed_in_chunk += 1
        if args.chunk_size and processed_in_chunk >= args.chunk_size:
            write_output(output_path, items_by_id, errors)
            processed_in_chunk = 0

    write_output(output_path, items_by_id, errors)
    print(f"Wrote {len(items_by_id)} items to {output_path}")
    if errors:
        print(f"Errors: {len(errors)} (see output JSON)")


if __name__ == "__main__":
    main()
