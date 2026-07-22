import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import AOS from 'aos'
import hyderabadImg from '@/assets/hyderabad.webp'
import canadaImg from '@/assets/canada.jpg'

const locations = [
  {
    name: 'Texas',
    sub: 'Irving, TX',
    img: 'https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=600&h=400&fit=crop',
  },
  {
    name: 'Florida',
    sub: 'Miami, FL',
    img: 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=600&h=400&fit=crop',
  },
  {
    name: 'Hyderabad',
    sub: 'Knowledge City',
    img: hyderabadImg,
  },
  {
    name: 'Toronto',
    sub: 'Ontario',
    img: canadaImg,
  },
  {
    name: 'Dubai',
    sub: 'Meydan Road',
    img: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&h=400&fit=crop',
  },
]

const services = [
  {
    icon: 'engineering',
    title: 'Product Engineering',
    desc: 'Scalable and Agile engineering from Ideation to Deployment. Transform your scalable ideas into reality with our expert team.',
    detailedDesc: 'Our Product Engineering services offer end-to-end solutions designed to scale your business. We combine agile methodologies, top-tier engineering talent, and cutting-edge tech stacks to build robust software products from scratch. Our core areas of expertise include architecture design, full-stack development, API integration, microservices deployment, and continuous deployment workflows. We ensure your product is designed for high availability, fault tolerance, and premium user experience.',
    iconBg: 'bg-primary-fixed',
    iconColor: 'text-primary',
    linkColor: 'text-primary',
  },
  {
    icon: 'fact_check',
    title: 'Quality Engineering',
    desc: 'Add Speed and Agility to Intelligent testing and QA to ensure excellence.',
    detailedDesc: 'Quality Engineering at Motivity Labs goes beyond simple bug testing. We implement automated testing pipelines (CI/CD integration), load testing, performance testing, security audits, and regression testing suites. Our engineers use industry-standard frameworks to build test coverage that keeps release velocity high without compromising quality. We focus on test automation, cross-browser performance, mobile responsiveness, and backend API stability.',
    iconBg: 'bg-secondary-fixed',
    iconColor: 'text-secondary',
    linkColor: 'text-secondary',
  },
  {
    icon: 'cloud',
    title: 'Cloud Services',
    desc: 'To be on Cloud, is to bring all your enterprise needs to the same page securely.',
    detailedDesc: 'We specialize in secure, scalable, and resilient cloud transformations. Whether migrating legacy databases, building serverless architectures, or setting up multi-cloud environments, our team has you covered. We work with AWS, Microsoft Azure, and Google Cloud Platform to deliver customized solutions. Our offerings include cloud migration planning, cloud architecture optimization, security hardening, automated backups, and 24/7 infrastructure monitoring.',
    iconBg: 'bg-primary-fixed',
    iconColor: 'text-primary',
    linkColor: 'text-primary',
  },
  {
    icon: 'query_stats',
    title: 'Data Analytics',
    desc: 'Drive transformations using actionable Data Insights. Uncover the trends and patterns for insightful business decisions.',
    detailedDesc: 'Unlock the hidden potential of your organizational data with our Data Analytics services. We build custom data lakes, configure real-time ETL pipelines, design interactive dashboard interfaces, and build predictive machine learning models. By turning raw data into structured visual reports, we empower executive and product teams to make intelligent, data-driven decisions that cut operational costs and identify new avenues of growth.',
    iconBg: 'bg-tertiary-fixed',
    iconColor: 'text-tertiary',
    linkColor: 'text-tertiary',
  },
]

export function CompanyLandingPage() {
  const [selectedService, setSelectedService] = useState<typeof services[0] | null>(null)
  
  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
    })
  }, [])

  return (
    <>
      {/* Hero Section */}
      <section className="w-full py-section-gap px-margin-mobile md:px-margin-desktop bg-surface-gray border-b border-border-light relative overflow-hidden">
        <div className="max-w-container-max mx-auto grid grid-cols-1 md:grid-cols-2 gap-gutter items-center">
          <div className="z-10 flex flex-col gap-unit" data-aos="fade-right">
            <h1 className="font-display-lg-mobile text-display-lg-mobile md:font-display-lg md:text-display-lg text-on-surface mb-4">
              Transform your IT infrastructure with{' '}
                <span style={{ color: '#ec661d' }}>Cutting edge technology</span>
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-6 max-w-lg">
              Empowering businesses to navigate the digital era with robust, scalable, and innovative solutions tailored for the future.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link
                to="/careers/openings"
                className="bg-orange-500 text-white px-8 py-3 rounded font-button text-button hover:shadow-[0_4px_12px_rgba(0,0,0,0.18)] transition-all"
              >
                Discover More
              </Link>
              <button 
                onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
                className="border border-primary text-primary px-8 py-3 rounded font-button text-button hover:bg-surface transition-all cursor-pointer"
              >
                Our Services
              </button>
            </div>
          </div>
          <div className="relative h-[400px] md:h-[500px] rounded-2xl overflow-hidden bg-surface-container border border-slate-200/80 shadow-[0_20px_50px_rgba(99,102,241,0.22)] hover:shadow-[0_20px_50px_rgba(99,102,241,0.35)] transition-all duration-500" data-aos="fade-left">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary-container to-surface-tint opacity-10" />
            <img
              alt="Abstract rendering of global data network connections and cloud infrastructure"
              className="w-full h-full object-cover"
              src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop"
            />
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="w-full py-section-gap px-margin-mobile md:px-margin-desktop bg-surface relative">
        <div className="max-w-container-max mx-auto grid grid-cols-1 md:grid-cols-12 gap-gutter items-center">
          <div className="md:col-span-5 flex flex-col items-start gap-4" data-aos="fade-right">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-fixed rounded-full text-primary font-label-md text-label-md">
              <span className="material-symbols-outlined text-sm">history</span>
              ABOUT MOTIVITY LABS
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display-lg text-display-lg text-orange-500">15</span>
              <span className="font-headline-md text-headline-md text-on-surface-variant">Years experience</span>
            </div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface mt-2">
              Driving Transformations Worldwide
            </h2>
          </div>
          <div className="md:col-span-7 flex flex-col gap-6" data-aos="fade-left">
            <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
              Motivity Labs helps customers all around the world create innovative products and services that can strengthen the most critical success factors in an organization's digital transformation journey.
            </p>
            <p className="font-body-md text-on-surface-variant">
              With years of experience in understanding gaps and leveraging up-to-the-minute technologies, right human capital, and best process automations has driven several businesses towards their desired digital destinations.
            </p>
            <Link
              to="/careers/openings"
              className="inline-flex items-center gap-2 text-primary font-button text-button hover:underline mt-4"
            >
              View Open Positions
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="w-full py-section-gap px-margin-mobile md:px-margin-desktop bg-surface-gray border-y border-border-light">
        <div className="max-w-container-max mx-auto">
          <div className="text-center mb-12 flex flex-col items-center" data-aos="fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-fixed rounded-full text-primary font-label-md text-label-md mb-4">
              OUR SERVICES
            </div>
            <h2 className="font-display-lg-mobile text-display-lg-mobile md:font-display-lg md:text-display-lg text-on-surface">
              Core Competencies
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {services.map((svc, idx) => (
              <div
                key={svc.title}
                data-aos="fade-up"
                data-aos-delay={(idx + 1) * 100}
                className="bg-surface p-8 rounded-lg border border-border-light shadow-sm hover:shadow-[0_8px_24px_rgba(0,90,156,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col items-start"
              >
                <div className={`p-4 ${svc.iconBg} rounded-full ${svc.iconColor} flex-shrink-0 mb-6`}>
                  <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>{svc.icon}</span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-3">{svc.title}</h3>
                <p className="font-body-md text-on-surface-variant mb-6">{svc.desc}</p>
                <button 
                  onClick={() => setSelectedService(svc)}
                  className={`${svc.linkColor} font-button text-button hover:underline mt-auto inline-flex items-center gap-1 bg-transparent border-none outline-none cursor-pointer`}
                >
                  Read More <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Global Presence Section */}
      <section className="w-full py-section-gap px-margin-mobile md:px-margin-desktop bg-surface">
        <div className="max-w-container-max mx-auto">
          <div className="text-center mb-12 flex flex-col items-center" data-aos="fade-up">
            <h2 className="font-display-lg-mobile text-display-lg-mobile md:font-display-lg md:text-display-lg text-on-surface mb-4">
              Global Presence
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
              Operating across key technological hubs to deliver seamless IT solutions worldwide.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {locations.map((loc, idx) => (
              <div
                key={loc.name}
                data-aos="fade-up"
                data-aos-delay={(idx + 1) * 80}
                className="relative h-64 rounded-xl overflow-hidden group cursor-pointer border border-slate-200/80 shadow-[0_8px_30px_rgba(99,102,241,0.06)] hover:shadow-[0_20px_40px_rgba(99,102,241,0.18)] transition-all duration-500"
              >
                <img
                  alt={`${loc.name} Office Location`}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  src={loc.img}
                />
                {/* Black gradient overlay that fades in on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Text container that slides up and fades in on hover */}
                <div className="absolute inset-x-0 bottom-0 p-5 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-out">
                  <h3 className="font-bold text-xl text-white tracking-tight">{loc.name}</h3>
                  <p className="text-xs text-slate-300 mt-1 truncate">{loc.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Dialog open={!!selectedService} onOpenChange={(open) => !open && setSelectedService(null)}>
        <DialogContent className="max-w-xl rounded-2xl p-0 bg-slate-50 border border-slate-100 shadow-2xl premium-job-dialog">
          {selectedService && (
            <>
              {/* Header */}
              <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-8 sm:px-8 rounded-t-2xl">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
                <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                <div className="absolute -bottom-10 left-10 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
                
                <div className="relative z-10 flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-white/15 backdrop-blur-md border border-white/10 shadow-sm text-white shrink-0">
                    <span className="material-symbols-outlined text-2xl">{selectedService.icon}</span>
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-extrabold text-white tracking-tight">{selectedService.title}</DialogTitle>
                    <DialogDescription className="text-sm text-indigo-150 font-medium mt-1">
                      Our Expertise & Competencies
                    </DialogDescription>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6 sm:px-8 sm:pb-8 space-y-4 text-slate-700">
                <p className="font-semibold text-slate-800 text-sm leading-relaxed bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/30">
                  {selectedService.desc}
                </p>
                <div className="space-y-2 pt-2">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Detailed Description</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {selectedService.detailedDesc}
                  </p>
                </div>
                
                <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
                  <Button onClick={() => setSelectedService(null)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-6">
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
