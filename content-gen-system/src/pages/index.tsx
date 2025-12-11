import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

// 特性卡片数据
const features = [
  {
    icon: '🎓',
    title: '系统性知识体系',
    description: '从核心理论到实践应用，7个主文档 + 7个专题分类，涵盖持续内容生成的完整知识图谱'
  },
  {
    icon: '💡',
    title: '深度案例分析',
    description: 'FlightRadar24、Spotify、Wikipedia等真实系统的技术架构深度剖析'
  },
  {
    icon: '🚀',
    title: '可落地实战方案',
    description: '50+项目模板、5种架构方案、1500+代码示例，从理论到生产的完整路径'
  },
  {
    icon: '🎨',
    title: '前沿技术探索',
    description: 'WebSocket、时序数据库、边缘计算、WebRTC等前沿技术的深入讲解'
  }
];

// 统计数据
const stats = [
  { value: '27+', label: '文档数量' },
  { value: '35万+', label: '总字数' },
  { value: '1500+', label: '代码示例' },
  { value: '50+', label: '项目模板' }
];

function Hero() {
  const {siteConfig} = useDocusaurusContext();

  return (
    <header className={styles.hero}>
      <div className={styles.heroBackground}>
        <div className={styles.heroGradient}></div>
      </div>

      <div className="container">
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            <span className={styles.gradientText}>持续内容生成系统</span>
          </h1>

          <p className={styles.heroSubtitle}>
            从理论到实践，探索永不停歇的内容创造之道
          </p>

          <p className={styles.heroDescription}>
            一套完整的知识体系，涵盖自然现象、数据流系统、算法生成、人类活动与抽象思维的多维度探索
          </p>

          <div className={styles.heroButtons}>
            <Link
              className={`button button--primary button--lg ${styles.primaryButton}`}
              to="/docs">
              开始阅读
            </Link>
            <Link
              className={`button button--outline button--lg ${styles.secondaryButton}`}
              to="/docs/实战方案/50个可落地项目清单">
              浏览项目
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function Stats() {
  return (
    <section className={styles.stats}>
      <div className="container">
        <div className={styles.statsGrid}>
          {stats.map((stat, idx) => (
            <div key={idx} className={styles.statCard}>
              <div className={styles.statValue}>{stat.value}</div>
              <div className={styles.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className={styles.features}>
      <div className="container">
        <h2 className={styles.sectionTitle}>核心特色</h2>

        <div className={styles.featuresGrid}>
          {features.map((feature, idx) => (
            <div key={idx} className={styles.featureCard}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDescription}>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContentHighlight() {
  return (
    <section className={styles.highlight}>
      <div className="container">
        <div className={styles.highlightContent}>
          <div className={styles.highlightText}>
            <h2 className={styles.highlightTitle}>完整的学习路径</h2>
            <p className={styles.highlightDescription}>
              从哲学思辨到技术实现，从自然现象到人工智能，全方位探索"什么样的内容可以永不停歇地产生"这一深刻问题。
            </p>
            <ul className={styles.highlightList}>
              <li>✨ 核心理论 - 建立系统性理解</li>
              <li>🔬 案例研究 - 学习真实系统架构</li>
              <li>⚡ 技术深度 - 掌握关键技术</li>
              <li>💼 商业模式 - 了解产品化路径</li>
              <li>🎯 实战方案 - 立即动手实践</li>
            </ul>
            <Link
              className={`button button--primary ${styles.highlightButton}`}
              to="/docs">
              探索内容
            </Link>
          </div>

          <div className={styles.highlightVisual}>
            <div className={styles.visualCard}>
              <div className={styles.visualIcon}>📚</div>
              <div className={styles.visualText}>
                <div className={styles.visualTitle}>7大核心文档</div>
                <div className={styles.visualSubtitle}>理论框架 → 实践应用</div>
              </div>
            </div>

            <div className={styles.visualCard}>
              <div className={styles.visualIcon}>🏗️</div>
              <div className={styles.visualText}>
                <div className={styles.visualTitle}>5种架构方案</div>
                <div className={styles.visualSubtitle}>MVP → 百万用户</div>
              </div>
            </div>

            <div className={styles.visualCard}>
              <div className={styles.visualIcon}>💻</div>
              <div className={styles.visualText}>
                <div className={styles.visualTitle}>50+项目模板</div>
                <div className={styles.visualSubtitle}>即学即用，快速启动</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className={styles.cta}>
      <div className="container">
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>准备好开始了吗？</h2>
          <p className={styles.ctaDescription}>
            时间在流逝，数据在涌动，算法在计算，人类在创造，思想在生成。<br />
            这一切，从未停止。
          </p>
          <Link
            className={`button button--primary button--lg ${styles.ctaButton}`}
            to="/docs">
            立即开始阅读
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();

  return (
    <Layout
      title={`${siteConfig.title}`}
      description="从理论到实践，探索永不停歇的内容创造之道。涵盖自然现象、数据流系统、算法生成、人类活动与抽象思维的完整知识体系。">
      <Hero />
      <Stats />
      <Features />
      <ContentHighlight />
      <CTA />
    </Layout>
  );
}
