import { GetStaticPaths, GetStaticProps } from 'next';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';

import Head from 'next/head';
import { RichText } from 'prismic-dom';
import { useEffect, useState } from 'react';
import Prismic from '@prismicio/client';
import { useRouter } from 'next/router';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  uid: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps) {
  const router = useRouter();
  const [readingTime, setReadingTime] = useState(0);

  function formatDate(date: string) {
    return format(new Date(date), 'dd MMM YYY', {
      locale: ptBR,
    });
  }

  function calculateAverageReadingTime() {
    const body = post.data.content.reduce((acc, item) => {
      const text = RichText.asText(item.body).match(/.*?[\\.\s]+?/g);
      if (text.length > 0) {
        return [
          ...acc,
          {
            text,
          },
        ];
      }
      return acc;
    }, []);

    const sumTextBody = body.reduce((acc, item) => {
      return acc + item.text.length;
    }, 0);

    setReadingTime(Math.ceil(sumTextBody / 200));
  }

  useEffect(() => {
    calculateAverageReadingTime();
  });

  if (router.isFallback) {
    return <span>Carregando....</span>;
  }

  return (
    <>
      <Head>
        <title>{post?.data?.title} | becaNews </title>
      </Head>
      <div className={styles.contentImage}>
        <img
          className={styles.postImage}
          src={post?.data?.banner?.url}
          alt="banner"
        />
      </div>
      <main className={styles.contentContainer}>
        <article>
          <h1>{post?.data?.title}</h1>
          <div className={commonStyles.icons}>
            <FiCalendar />
            <span>{formatDate(post?.first_publication_date)}</span>
            <FiUser /> <span>{post?.data.author}</span>
            <FiClock /> <span>{readingTime} min</span>
          </div>
          {post?.data?.content.map(value => (
            <div key={value.heading}>
              <h2 key={value.heading}>{value.heading}</h2>
              {value.body.map(body => (
                <p key={body.text}>{body.text}</p>
              ))}
            </div>
          ))}
        </article>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();

  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.uid'],
      pageSize: 5,
    }
  );

  const posts = postsResponse.results.map(post => {
    return {
      uid: post.uid,
    };
  });

  const data = posts.reduce((acc, item) => {
    if (item.uid) {
      return [
        ...acc,
        {
          params: {
            slug: item.uid,
          },
        },
      ];
    }
    return acc;
  }, []);

  return {
    paths: data,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;

  const prismic = getPrismicClient();

  const response = await prismic.getByUID('posts', String(slug), {});

  const post = {
    first_publication_date: response.first_publication_date,
    uid: response.uid,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      content: response.data.content,
      banner: {
        url: response.data.banner.url,
      },
    },
  };

  return {
    props: {
      post,
    },
  };
};
