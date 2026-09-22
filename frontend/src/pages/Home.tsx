import { useState } from 'react';
import { 
  Shield, 
  Lock, 
  Activity, 
  ArrowRight, 
  Search, 
  FileText, 
  CheckCircle, 
  Server, 
  Globe, 
  Settings, 
  Users, 
  Star,
  Zap,
  ChevronDown
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    { q: "How often should I scan my website?", a: "For optimal security, we recommend daily scans for production environments. However, even a weekly scan can catch critical new vulnerabilities." },
    { q: "Is my website data safe during the scan?", a: "Yes. Our scans are non-invasive and only check publicly accessible endpoints and configurations. We never access your private data or affect site performance." },
    { q: "What does the security score mean?", a: "The score is a weighted average of your site's security posture, evaluating SSL strength, open ports, missing headers, and potential vulnerabilities on a 0-100 scale." },
    { q: "Can I upgrade or downgrade my plan?", a: "Absolutely. You can change your subscription tier at any time from your account settings." },
    { q: "Do you provide API access?", a: "Yes, our Pro and Enterprise plans include full REST API access to integrate scans into your CI/CD pipeline." },
    { q: "What payment methods do you accept?", a: "We accept all major credit cards, PayPal, and for Enterprise customers, we offer invoice-based billing." }
  ];

  return (
    <div className="flex flex-col bg-background text-foreground">
      
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center py-32 px-4 text-center border-b border-border/50 bg-gradient-to-b from-background to-secondary/20">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full text-primary mb-8 animate-pulse">
          <Shield className="w-12 h-12" />
        </div>
        <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-6">
          Enterprise-Grade <br /> Website Security Scanner
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mb-10">
          Instantly discover vulnerabilities, exposed secrets, and misconfigurations in your web infrastructure before attackers do.
        </p>
        <div className="flex gap-4">
          <Link to="/auth" className="px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
            Start Scanning Free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* What Does Our Scanner Detect? */}
      <section className="py-24 px-4 max-w-7xl mx-auto w-full">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-primary mb-4">What Does Our Scanner Detect?</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Lock, title: "SSL/TLS Security", color: "text-severity-safe", bg: "bg-severity-safe/10", desc: "Validates SSL certificates, checks encryption protocols (TLS 1.2/1.3), verifies certificate expiry, and identifies insecure HTTPS configurations." },
            { icon: Server, title: "Port Scanning", color: "text-severity-critical", bg: "bg-severity-critical/10", desc: "Detects open ports, identifies exposed services, scans for known CVE vulnerabilities, and flags potential security risks in server configurations." },
            { icon: Shield, title: "Security Score", color: "text-primary", bg: "bg-primary/10", desc: "Comprehensive security rating based on SSL strength, vulnerability count, security headers, and overall risk assessment (0-100 scale)." },
            { icon: Activity, title: "SEO & Performance", color: "text-blue-500", bg: "bg-blue-500/10", desc: "Analyzes page load speed, TTFB, resource optimization, SEO meta tags, heading structure, and accessibility compliance." }
          ].map((item, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col items-start relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-6 ${item.bg} ${item.color}`}>
                <item.icon className="w-6 h-6" />
              </div>
              <h3 className={`text-xl font-bold mb-4 ${item.color}`}>{item.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 bg-secondary/30 border-y border-border/50">
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-primary mb-4">How It Works</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { num: "01", icon: Search, title: "Enter Your URL", desc: "Simply paste your website URL into the scanner. No registration or account required to get started." },
              { num: "02", icon: Shield, title: "We Analyze Your Site", desc: "Our advanced algorithms scan for SSL certificates, open ports, vulnerabilities, and security headers in real-time." },
              { num: "03", icon: FileText, title: "Get Detailed Report", desc: "Receive a comprehensive security report with vulnerability ratings, SEO metrics, and performance insights." },
              { num: "04", icon: CheckCircle, title: "Take Action", desc: "Follow our recommendations to fix security issues and improve your website's overall protection." }
            ].map((item, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-8 shadow-sm relative pt-12">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold shadow-lg ring-4 ring-background">
                  {item.num}
                </div>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 bg-secondary text-primary mx-auto">
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-center text-primary">{item.title}</h3>
                <p className="text-muted-foreground text-sm text-center leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Powerful Security Features */}
      <section className="py-24 px-4 max-w-7xl mx-auto w-full">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-primary mb-4">Powerful Security Features</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">Comprehensive website security analysis with advanced scanning capabilities in just a few simple steps. Our scanner does all the heavy lifting for you.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Shield, title: "Comprehensive Security Scanning", desc: "Our scanner performs a wide range of security checks to give you a complete picture of your website's security posture." },
            { icon: Activity, title: "Real-Time Vulnerability Detection", desc: "Identify critical vulnerabilities in real-time with our continuously updated vulnerability database, ensuring you stay protected." },
            { icon: Lock, title: "SSL/TLS Certificate Analysis", desc: "Verify SSL certificates, check expiration dates, and ensure proper encryption protocols for secure communications." },
            { icon: Server, title: "Port & Service Scanning", desc: "Identify open ports, running services, and potential vulnerabilities in your server infrastructure." },
            { icon: Shield, title: "Security Headers Check", desc: "Detect missing security headers (CSP, HSTS, X-Frame-Options) that protect against common attacks." },
            { icon: Globe, title: "SEO Optimization Review", desc: "Analyze meta tags, keywords, and search engine optimization to improve your online visibility." },
            { icon: Zap, title: "Performance Metrics", desc: "Get insights on page load times, resource optimization, and performance recommendations." },
            { icon: Settings, title: "Recommendations", desc: "Receive personalized security recommendations based on the scan results to help you improve your website's security posture." },
            { icon: FileText, title: "Detailed Reports", desc: "Download comprehensive PDF reports with actionable recommendations and security insights." }
          ].map((item, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-8 shadow-sm hover:bg-secondary/20 transition-colors flex flex-col items-center text-center">
              <item.icon className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-bold mb-3">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About JobJockey */}
      <section className="py-24 px-4 bg-secondary/30 border-y border-border/50">
        <div className="max-w-5xl mx-auto w-full">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-primary mb-4">About JobJockey</h2>
            <p className="text-muted-foreground">Leading the way in cybersecurity solutions with cutting-edge technology and expert analysis.</p>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-8 md:p-12 shadow-sm mb-8">
            <h3 className="text-xl font-bold text-primary mb-6">Who We Are</h3>
            <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
              <p>JobJockey is a premier cybersecurity platform dedicated to making the web a safer place. Founded by security experts and ethical hackers, we've built a comprehensive website security scanner that helps businesses and individuals identify vulnerabilities before attackers do.</p>
              <p>Our mission is to democratize cybersecurity by providing enterprise-grade security scanning tools that are accessible, affordable, and easy to use. Whether you're a small business owner, a developer, or a large enterprise, we believe everyone deserves to know their security posture.</p>
              <p>With over 100,000+ websites scanned and counting, JobJockey has helped organizations worldwide strengthen their security defenses, achieve compliance, and protect their digital assets from emerging threats.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
              { icon: Shield, title: "Security First", desc: "We prioritize your security with non-invasive scans and encrypted data handling." },
              { icon: CheckCircle, title: "Accuracy", desc: "Powered by advanced algorithms that deliver precise vulnerability detection." },
              { icon: Users, title: "Community", desc: "Built by security experts who believe in sharing knowledge and protecting users." },
              { icon: Star, title: "Excellence", desc: "Committed to continuous improvement and staying ahead of cyber threats." }
            ].map((item, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-6 text-center shadow-sm">
                <item.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                <h4 className="font-bold mb-2 text-sm">{item.title}</h4>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl p-8 flex flex-wrap justify-between gap-8 text-center shadow-sm">
            {[
              { stat: "100K+", label: "Websites Scanned", color: "text-blue-500" },
              { stat: "50K+", label: "Vulnerabilities Found", color: "text-purple-500" },
              { stat: "99.9%", label: "Accuracy Rate", color: "text-severity-safe" },
              { stat: "24/7", label: "Monitoring Available", color: "text-severity-critical" },
              { stat: "4.8/5", label: "User Satisfaction", color: "text-foreground" },
              { stat: "100%", label: "Data Privacy", color: "text-foreground" }
            ].map((item, i) => (
              <div key={i} className="flex-1 min-w-[120px]">
                <div className={`text-3xl font-display font-bold mb-1 ${item.color}`}>{item.stat}</div>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{labelSplitter(item.label)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="py-24 px-4 max-w-4xl mx-auto w-full">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-primary mb-4">Frequently Asked Questions</h2>
          <p className="text-muted-foreground">Find answers to common questions about our service</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-card border border-border rounded-lg overflow-hidden h-fit">
              <button 
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left font-semibold hover:bg-secondary/50 transition-colors"
              >
                <span className="text-sm">{faq.q}</span>
                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-4">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-primary text-primary-foreground border-y border-primary-foreground/10 text-center relative overflow-hidden">
        {/* Abstract background shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-white blur-3xl" />
        </div>
        
        <div className="relative z-10">
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">Protect Your Website Today</h2>
          <p className="text-primary-foreground/80 text-lg max-w-2xl mx-auto mb-10">
            Join thousands of businesses using JobJockey today to secure their web presence
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth" className="w-full sm:w-auto px-8 py-4 bg-background text-foreground font-semibold rounded-lg hover:bg-secondary transition-colors flex items-center justify-center gap-2">
              <Search className="w-5 h-5" /> Start Free Scan
            </Link>
            <Link to="/auth" className="w-full sm:w-auto px-8 py-4 bg-transparent border border-primary-foreground/30 text-primary-foreground font-semibold rounded-lg hover:bg-primary-foreground/10 transition-colors flex items-center justify-center gap-2">
              <Users className="w-5 h-5" /> Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer is handled by MarketingLayout, but user requested footer links based on image */}
      {/* We can modify MarketingLayout later if needed, but the image shows: JobJockey, Product, Legal, Follow Us */}
      {/* For now, I'll add a rich footer directly in MarketingLayout since it belongs in the layout */}
    </div>
  );
}

// Helper to split long labels in stats
function labelSplitter(label: string) {
  const parts = label.split(' ');
  if (parts.length > 1) {
    return (
      <>
        {parts.slice(0, Math.ceil(parts.length / 2)).join(' ')}
        <br />
        {parts.slice(Math.ceil(parts.length / 2)).join(' ')}
      </>
    );
  }
  return label;
}
