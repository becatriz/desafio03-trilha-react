import { FiCalendar, FiUser } from 'react-icons/fi';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { GetStaticProps } from 'next';
import Head from 'next/head';

import Prismic from '@prismicio/client';

import { useState } from 'react';
import Link from 'next/link';
import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps) {
  const [searchPost, setSearchPost] = useState<PostPagination>(postsPagination);
  const isNextPage = searchPost?.next_page;

  function formatDate(date: string) {
    return format(new Date(date), 'dd MMM YYY', {
      locale: ptBR,
    });
  }

  async function handleLoadMorePosts() {
    const res = await fetch(postsPagination?.next_page);
    const data = await res.json();

    const post = data.results.reduce((acc: Post, item: Post) => {
      return {
        ...acc,
        uid: item.uid,
        first_publication_date: item.first_publication_date,
        data: {
          title: item.data.title,
          subtitle: item.data?.subtitle,
          author: item.data?.author,
        },
      };
    }, {});

    setSearchPost({
      results: [...searchPost.results, post],
      next_page: data.next_page,
    });
  }

  return (
    <>
      <Head>
        <title>Home | posts</title>
      </Head>
      <main className={styles.contentContainer}>
        <div>
          {searchPost.results.map(post => (
            <Link href={`/post/${post.uid}`} key={post.uid}>
              <a>
                <h1>{post.data.title}</h1>
                <span>{post.data.subtitle}</span>
                <div className={commonStyles.icons}>
                  <FiCalendar />{' '}
                  <span>{formatDate(post.first_publication_date)}</span>
                  <FiUser /> <span>{post.data.author}</span>
                </div>
              </a>
            </Link>
          ))}
        </div>

        {isNextPage && (
          <button
            className={styles.loadMorePosts}
            type="button"
            onClick={handleLoadMorePosts}
          >
            Carregar mais posts
          </button>
        )}
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title', 'posts.subtitle', 'posts.author'],
      pageSize: 5,
    }
  );

  const posts = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data?.subtitle,
        author: post.data?.author,
      },
    };
  });

  const postsPagination = {
    next_page: postsResponse?.next_page ?? '',
    results: posts,
  };

  return {
    props: {
      postsPagination,
    },
  };
};
