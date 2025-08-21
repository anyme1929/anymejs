/**
 * 依赖注入类型符号常量
 * 用于标识不同服务的注入令牌
 */
export const SYMBOLS = {
  App: Symbol.for("App"),
  CoreConfig: Symbol.for("CoreConfig"),
  ConfigProvider: Symbol.for("ConfigProvider"),
  Config: Symbol.for("Config"),
  Cache: Symbol.for("Cache"),
  DataSource: Symbol.for("DataSource"),
  Redis: Symbol.for("Redis"),
  Logger: Symbol.for("Logger"),
  GracefulExit: Symbol.for("GracefulExit"),
  CreateSession: Symbol.for("CreateSession"),
  CreateServer: Symbol.for("CreateServer"),
  ClientIp: Symbol.for("ClientIp"),
  IocAdapter: Symbol.for("IocAdapter"),
  Middleware: Symbol.for("Middleware"),
};
export const IV_LENGTH = 16;
export const ENC_DEFAULT_KEY = "default-anymejs-unsafe-key";
export const WELLCOME_HTML = `<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AnymeJS</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100vh;
            width: 100vw;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            padding: 0;
        }

        .welcome-container {
            text-align: center;
            padding: 1.5rem;
            background: rgba(255, 255, 255, 0.1);
            -webkit-backdrop-filter: blur(10px);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
            border: 1px solid rgba(255, 255, 255, 0.18);
            width: 90vw;
            max-width: 700px;
            height: 90vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            animation: fadeIn 0.8s ease-out;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }

            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 1rem;
            background: linear-gradient(135deg, #ffffff, #f0f0f0);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 3rem;
            font-weight: bold;
            color: #667eea;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
            flex-shrink: 0;
            position: relative;
            overflow: hidden;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% {
                box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.4);
            }

            70% {
                box-shadow: 0 0 0 10px rgba(102, 126, 234, 0);
            }

            100% {
                box-shadow: 0 0 0 0 rgba(102, 126, 234, 0);
            }
        }

        h1 {
            color: white;
            font-size: 2rem;
            margin-bottom: 0.5rem;
            text-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            flex-shrink: 0;
        }

        .subtitle {
            color: rgba(255, 255, 255, 0.95);
            font-size: 1rem;
            margin-bottom: 1rem;
            line-height: 1.5;
            flex-shrink: 0;
            font-weight: 300;
        }

        .features {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 0.7rem;
            margin-bottom: 1rem;
            flex-shrink: 0;
        }

        .feature {
            background: rgba(255, 255, 255, 0.15);
            padding: 0.5rem 1rem;
            border-radius: 50px;
            color: white;
            font-size: 0.8rem;
            -webkit-backdrop-filter: blur(10px);
            backdrop-filter: blur(5px);
            transition: all 0.3s ease;
        }

        .feature:hover {
            transform: translateY(-3px);
            background: rgba(255, 255, 255, 0.25);
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
        }

        .libraries-section {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            padding: 1rem;
            margin: 0.5rem 0;
            text-align: left;
            flex-grow: 1;
            overflow-y: auto;
            /* 隐藏滚动条 */
            -ms-overflow-style: none;
            /* IE 10+ */
            scrollbar-width: none;
            /* Firefox */
        }

        .libraries-section::-webkit-scrollbar {
            width: 0px;
            /* Chrome, Safari */
            background: transparent;
            /* Chrome, Safari */
        }


        .library {
            margin-bottom: 0.8rem;
            padding: 0.7rem;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.05);
            transition: all 0.3s ease;
        }

        .library:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: translateX(5px);
        }

        .library:last-child {
            margin-bottom: 0;
        }

        .library-name {
            color: #fff;
            font-weight: bold;
            margin-bottom: 0.2rem;
            font-size: 0.95rem;
        }

        .library-description {
            color: rgba(255, 255, 255, 0.85);
            font-size: 0.8rem;
            margin-bottom: 0.3rem;
            line-height: 1.4;
        }

        .library-link {
            color: #a3d0ff;
            text-decoration: none;
            font-size: 0.75rem;
            display: inline-block;
            margin-right: 0.5rem;
            transition: all 0.2s ease;
        }

        .library-link:hover {
            text-decoration: underline;
            color: #d0e5ff;
        }

        .github-links {
            display: flex;
            flex-direction: row;
            gap: 0.8rem;
            margin: 0.8rem 0;
            flex-shrink: 0;
        }

        .github-link {
            display: inline-block;
            background: rgba(255, 255, 255, 0.15);
            color: white;
            padding: 0.6rem 1rem;
            border-radius: 50px;
            text-decoration: none;
            font-weight: bold;
            font-size: 0.85rem;
            transition: all 0.3s ease;
            border: 1px solid rgba(255, 255, 255, 0.2);
            flex: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .github-link:hover {
            background: rgba(255, 255, 255, 0.25);
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }

        .footer {
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.75rem;
            flex-shrink: 0;
        }

        @media (max-width: 768px) {
            .welcome-container {
                padding: 1rem;
                width: 95vw;
                height: 95vh;
            }

            h1 {
                font-size: 1.7rem;
            }

            .subtitle {
                font-size: 0.9rem;
            }

            .features {
                flex-direction: column;
                align-items: center;
                gap: 0.5rem;
            }

            .logo {
                width: 70px;
                height: 70px;
                font-size: 2.5rem;
            }

            .github-links {
                flex-direction: column;
            }

            .libraries-section {
                padding: 0.8rem;
            }

            .feature {
                font-size: 0.75rem;
                padding: 0.4rem 0.8rem;
            }
        }

        @media (max-width: 480px) {
            .welcome-container {
                padding: 0.8rem;
                width: 98vw;
                height: 98vh;
            }

            h1 {
                font-size: 1.5rem;
            }

            .subtitle {
                font-size: 0.8rem;
            }

            .logo {
                width: 60px;
                height: 60px;
                font-size: 2rem;
            }

            .feature {
                font-size: 0.7rem;
                padding: 0.3rem 0.6rem;
            }

            .library-name {
                font-size: 0.9rem;
            }

            .library-description {
                font-size: 0.75rem;
            }

            .library-link {
                font-size: 0.7rem;
            }
        }
    </style>
</head>

<body>
    <div class="welcome-container">
        <div>
            <div class="logo">A</div>
            <h1>AnymeJS</h1>
            <p class="subtitle">一个现代化的 Node.js 框架，帮助您快速构建高效、可扩展的 Web 应用程序</p>

            <div class="features">
                <div class="feature">🚀 高性能</div>
                <div class="feature">🔧 易于扩展</div>
                <div class="feature">📦 开箱即用</div>
            </div>
        </div>

        <div class="libraries-section">
            <div class="library">
                <div class="library-name">InversifyJS</div>
                <div class="library-description">一个强大且轻量级的控制反转（IoC）容器，用于 TypeScript 和 JavaScript 应用程序的依赖注入。</div>
                <a href="https://inversify.io/" target="_blank" rel="noopener" class="library-link">官方文档</a>
                <a href="https://github.com/inversify/InversifyJS" target="_blank" rel="noopener"
                    class="library-link">GitHub 仓库</a>
            </div>

            <div class="library">
                <div class="library-name">routing-controllers</div>
                <div class="library-description">基于装饰器的路由控制器，让您能够通过类和装饰器以声明式的方式创建结构化、可读性高的控制器。</div>
                <a href="https://github.com/typestack/routing-controllers" target="_blank" rel="noopener"
                    class="library-link">GitHub 仓库</a>
            </div>

            <div class="library">
                <div class="library-name">TypeORM</div>
                <div class="library-description">TypeScript 和 JavaScript 的对象关系映射（ORM）工具，用于在 Node.js 环境中与数据库交互。</div>
                <a href="https://typeorm.io/" target="_blank" rel="noopener" class="library-link">官方文档</a>
                <a href="https://github.com/typeorm/typeorm" target="_blank" rel="noopener" class="library-link">GitHub
                    仓库</a>
            </div>

            <div class="library">
                <div class="library-name">ioredis</div>
                <div class="library-description">一个功能强大且高效的 Redis 客户端，用于 Node.js 环境中的 Redis 数据库操作。</div>
                <a href="https://github.com/redis/ioredis" target="_blank" rel="noopener" class="library-link">GitHub
                    仓库</a>
            </div>
        </div>

        <div>
            <div class="github-links">
                <a href="https://github.com/anyme1929/anymejs" target="_blank" rel="noopener" class="github-link">
                    GitHub 仓库
                </a>
                <a href="https://github.com/anyme1929/anymejs/blob/master/README.md" target="_blank" rel="noopener"
                    class="github-link">
                    详细文档
                </a>
            </div>

            <p class="footer">Powered by AnymeJS Framework</p>
        </div>
    </div>
</body>

</html>`;
