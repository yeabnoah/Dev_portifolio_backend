"use client";

import ErrorUi from "@/components/blocks/error";
import LoadingBlock from "@/components/blocks/loadingBlock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import authClient from "@/lib/auth-client";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { PencilIcon, Trash2Icon } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import toast from "react-hot-toast";
import "react-quill/dist/quill.snow.css";

// Dynamically import ReactQuill with SSR disabled
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

interface ArticleInterface {
  id: string;
  title: string;
  description: string;
  tags: string[];
  userId?: string;
}

export default function ArticlesPage() {
  const session = authClient.getSession();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const [newArticle, setNewArticle] = useState<ArticleInterface>({
    id: "",
    title: "",
    description: "",
    tags: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const {
    data: articles,
    refetch,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["articles"],
    queryFn: async () => {
      const response = await axios.get(
        `${backendUrl}/public/articles/${(await session).data?.user.id}`,
        {
          withCredentials: true,
        }
      );
      return response.data;
    },
    refetchOnWindowFocus: false,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewArticle((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value.split(",").map((tag) => tag.trim());
    setNewArticle((prev) => ({ ...prev, tags }));
    if (errors["tags"]) {
      setErrors((prev) => ({ ...prev, tags: "" }));
    }
  };

  const handleDescriptionChange = (content: string) => {
    setNewArticle((prev) => ({ ...prev, description: content }));
    if (errors["description"]) {
      setErrors((prev) => ({ ...prev, description: "" }));
    }
  };

  const { isPending, mutate } = useMutation({
    mutationFn: async (article: ArticleInterface) => {
      const response = await axios.post(
        `${backendUrl}/article`,
        { data: article },
        {
          withCredentials: true,
        }
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Article published successfully!");
      setNewArticle({ id: "", title: "", description: "", tags: [] });
      refetch();
    },
    onError: () => {
      toast.error("Failed to publish the article.");
    },
  });

  const editMutation = useMutation({
    mutationFn: async (article: ArticleInterface) => {
      const { id, ...articleData } = article;

      const response = await axios.patch(
        `${backendUrl}/article/${id}`,
        articleData,
        {
          withCredentials: true,
        }
      );

      return response.data;
    },
    onSuccess: () => {
      toast.success("Article updated successfully!");
      setNewArticle({ id: "", title: "", description: "", tags: [] });
      refetch();
    },
    onError: () => {
      toast.error("Failed to update the article.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (articleId: string) => {
      const response = await axios.delete(
        `${backendUrl}/article/${articleId}`,
        {
          withCredentials: true,
        }
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Article deleted successfully!");
      refetch();
    },
    onError: () => {
      toast.error("Failed to delete the article.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newArticle.title ||
      !newArticle.description ||
      newArticle.tags.length === 0
    ) {
      setErrors({
        title: newArticle.title ? "" : "Title is required",
        description: newArticle.description ? "" : "Description is required",
        tags: newArticle.tags.length > 0 ? "" : "At least one tag is required",
      });
      return;
    }

    if (newArticle.id) {
      editMutation.mutate(newArticle);
    } else {
      mutate(newArticle);
    }
  };

  const handleEdit = (article: ArticleInterface) => {
    setNewArticle(article);
  };

  const handleDelete = (articleId: string) => {
    deleteMutation.mutate(articleId);
  };

  if (isError) {
    return <ErrorUi />;
  }

  if (isLoading) {
    return <LoadingBlock />;
  }

  return (
    <div className="space-y-6 w-full">
      <h1 className="text-xl font-medium">Articles</h1>
      <div className="card p-5 dark:bg-white/5">
        <h2 className=" text-white">
          {newArticle.id ? "Edit Article" : "Create New Article"}
        </h2>
        <hr className=" my-5" />
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              value={newArticle.title}
              onChange={handleInputChange}
              className={errors.title ? "border-red-500" : ""}
            />
            {errors.title && (
              <p className="text-red-500 text-sm">{errors.title}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            {typeof window !== "undefined" && ReactQuill && (
              <ReactQuill
                value={newArticle.description}
                onChange={handleDescriptionChange}
                style={{ color: "white" }}
                modules={{
                  toolbar: [
                    [{ header: "1" }, { header: "2" }, { font: [] }],
                    [{ list: "ordered" }, { list: "bullet" }],
                    ["bold", "italic", "underline", "strike"],
                    [{ align: [] }],
                    ["link", "image"],
                    ["blockquote"],
                    ["code-block"],
                  ],
                }}
                theme="snow"
              />
            )}
            {errors.description && (
              <p className="text-red-500 text-sm">{errors.description}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              name="tags"
              value={newArticle.tags.join(", ")}
              onChange={handleTagsChange}
              className={errors.tags ? "border-red-500" : ""}
            />
            {errors.tags && (
              <p className="text-red-500 text-sm">{errors.tags}</p>
            )}
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? newArticle.id
                ? "Updating..."
                : "Publishing..."
              : newArticle.id
              ? "Update Article"
              : "Publish Article"}
          </Button>
        </form>
      </div>

      <div className="mt-8 border-white p-3 rounded">
        <h2 className="text-xl font-medium mb-4">Published Articles</h2>

        {articles && articles.length === 0 ? (
          <p className="text-gray-500">No articles available.</p>
        ) : (
          <ul className="space-y-3">
            {articles?.map((article: ArticleInterface) => (
              <li
                key={article.id}
                className="flex justify-between items-start dark:bg-white/5 dark:border-white/5 border-white/25 border rounded-md p-3"
              >
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">
                    {article.title}
                  </h3>
                  <p className="text-sm text-black/80 dark:text-white/70 mb-1">
                    {article.description.length > 100
                      ? `${article.description.slice(0, 100)}...`
                      : article.description}
                  </p>
                  <p className="text-xs text-black/70 dark:text-white/50">
                    {article.tags.slice(0, 3).join(", ")}
                  </p>
                </div>

                <div className="flex gap-2 items-center">
                  <Button
                    className="p-2"
                    size="icon"
                    onClick={() => handleEdit(article)}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    className="p-2 bg-red-500"
                    size="icon"
                    onClick={() => handleDelete(article.id)}
                  >
                    <Trash2Icon className=" text-white" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
