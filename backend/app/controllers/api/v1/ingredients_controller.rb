# frozen_string_literal: true

module Api
  module V1
    class IngredientsController < ApplicationController
      # GET /api/v1/ingredients/search?query=사과
      def search
        query = params[:query].to_s.strip

        if query.empty?
          render json: { error: "검색어를 입력해주세요." }, status: :bad_request
          return
        end

        service = OpenApiService.new
        result = service.fetch_all(query)

        render json: result, status: :ok
      end
    end
  end
end
