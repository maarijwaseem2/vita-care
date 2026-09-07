import Hero from '@/components/home/Hero';
import Departments from '@/components/home/Departments';
import WhyChoose from '@/components/home/WhyChoose';
import FeaturedDoctors from '@/components/home/FeaturedDoctors';
import AiDoctorCta from '@/components/home/AiDoctorCta';
import LatestBlog from '@/components/home/LatestBlog';
import Newsletter from '@/components/home/Newsletter';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Departments />
      <WhyChoose />
      <FeaturedDoctors />
      <AiDoctorCta />
      <LatestBlog />
      <Newsletter />
    </>
  );
}
